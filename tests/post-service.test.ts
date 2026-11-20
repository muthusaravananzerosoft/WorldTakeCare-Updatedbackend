import { describe, expect, it, vi } from 'vitest';
import type { CommentRecord, PostRecord } from '../src/entities/post.types.js';
import type { CommentRepository, PostRepository } from '../src/repositories/post.repository.js';
import type { Page, PageRequest } from '../src/repositories/repository.interface.js';
import { createPostService, type PostServiceDeps } from '../src/services/post.service.js';

const owner = { id: 7, role: 'member' as const };
const other = { id: 99, role: 'member' as const };
const admin = { id: 1, role: 'admin' as const };

function postRecord(overrides: Partial<PostRecord> = {}): PostRecord {
  return {
    id: 1,
    userId: 7,
    title: 'My Madurai tour',
    description: 'A wonderful trip around the temples',
    imageUrl: 'https://cdn.example.com/img.jpg',
    publishedDate: '2026-11-19',
    readingTimeMin: 1,
    createdAt: '2026-11-19T10:00:00.000Z',
    updatedAt: '2026-11-19T10:00:00.000Z',
    authorFirstName: 'Muthu',
    authorLastName: 'S',
    commentCount: 0,
    ...overrides,
  };
}

function commentRecord(overrides: Partial<CommentRecord> = {}): CommentRecord {
  return {
    id: 5,
    postId: 1,
    userId: 7,
    comment: 'Nice trip!',
    createdAt: '2026-11-19T10:05:00.000Z',
    updatedAt: '2026-11-19T10:05:00.000Z',
    authorFirstName: 'Muthu',
    authorLastName: 'S',
    ...overrides,
  };
}

function makeDeps(): PostServiceDeps {
  const emptyPage = <T,>({ page, pageSize }: PageRequest): Page<T> => ({
    items: [],
    page,
    pageSize,
    totalItems: 0,
  });
  return {
    posts: {
      create: vi.fn<PostRepository['create']>(async () => postRecord()),
      findById: vi.fn<PostRepository['findById']>(async () => null),
      findPage: vi.fn<PostRepository['findPage']>(async (r) => emptyPage(r)),
      update: vi.fn<PostRepository['update']>(async () => null),
      delete: vi.fn<PostRepository['delete']>(async () => false),
    },
    comments: {
      create: vi.fn<CommentRepository['create']>(async () => commentRecord()),
      findById: vi.fn<CommentRepository['findById']>(async () => null),
      findPageByPost: vi.fn<CommentRepository['findPageByPost']>(async (_p, r) => emptyPage(r)),
      update: vi.fn<CommentRepository['update']>(async () => null),
      delete: vi.fn<CommentRepository['delete']>(async () => false),
    },
  };
}

describe('postService.create', () => {
  it('stores the post for the token user with auto reading time', async () => {
    const deps = makeDeps();
    const svc = createPostService(deps);
    const input = {
      title: 'My Madurai tour',
      description: 'A wonderful trip around the temples',
      publishedDate: '2026-11-19',
    };

    const res = await svc.create(7, input);

    expect(deps.posts.create).toHaveBeenCalledWith(7, input, 1);
    expect(res).toMatchObject({ title: 'My Madurai tour', readingTimeMin: 1, commentCount: 0 });
    expect(res.author).toEqual({ id: 7, firstName: 'Muthu', lastName: 'S' });
  });

  it('computes reading time from word count (~200 wpm)', async () => {
    const deps = makeDeps();
    const svc = createPostService(deps);
    const long = Array.from({ length: 450 }, (_, i) => `w${i}`).join(' ');

    await svc.create(7, { title: 't', description: long, publishedDate: '2026-11-19' });

    expect(deps.posts.create).toHaveBeenCalledWith(7, expect.anything(), 3);
  });
});

describe('postService.update', () => {
  it('lets the owner patch and recomputes reading time when description changes', async () => {
    const deps = makeDeps();
    vi.mocked(deps.posts.findById).mockResolvedValue(postRecord());
    vi.mocked(deps.posts.update).mockResolvedValue(postRecord({ title: 'new' }));
    const svc = createPostService(deps);

    const res = await svc.update(1, owner, { title: 'new', description: 'short text' });

    expect(deps.posts.update).toHaveBeenCalledWith(
      1,
      { title: 'new', description: 'short text' },
      1,
    );
    expect(res.title).toBe('new');
  });

  it('rejects a non-owner before updating', async () => {
    const deps = makeDeps();
    vi.mocked(deps.posts.findById).mockResolvedValue(postRecord());
    const svc = createPostService(deps);

    await expect(svc.update(1, other, { title: 'x' })).rejects.toMatchObject({ statusCode: 404 });
    expect(deps.posts.update).not.toHaveBeenCalled();
  });

  it('lets an admin update someone else\'s post', async () => {
    const deps = makeDeps();
    vi.mocked(deps.posts.findById).mockResolvedValue(postRecord());
    vi.mocked(deps.posts.update).mockResolvedValue(postRecord({ title: 'admin edit' }));
    const svc = createPostService(deps);

    const res = await svc.update(1, admin, { title: 'admin edit' });
    expect(res.title).toBe('admin edit');
  });
});

describe('postService.delete', () => {
  it('lets an admin delete someone else\'s post', async () => {
    const deps = makeDeps();
    vi.mocked(deps.posts.findById).mockResolvedValue(postRecord());
    const svc = createPostService(deps);

    await svc.delete(1, admin);
    expect(deps.posts.delete).toHaveBeenCalledWith(1);
  });
});

describe('postService comments', () => {
  it('adds a comment after checking the post exists', async () => {
    const deps = makeDeps();
    vi.mocked(deps.posts.findById).mockResolvedValue(postRecord());
    const svc = createPostService(deps);

    const res = await svc.addComment(1, 7, 'Nice trip!');
    expect(res.comment).toBe('Nice trip!');
    expect(deps.comments.create).toHaveBeenCalledWith(1, 7, 'Nice trip!');
  });

  it('404s when commenting on a missing post', async () => {
    const svc = createPostService(makeDeps());
    await expect(svc.addComment(1, 7, 'hi')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('rejects comment edits by a non-owner', async () => {
    const deps = makeDeps();
    vi.mocked(deps.posts.findById).mockResolvedValue(postRecord());
    vi.mocked(deps.comments.findById).mockResolvedValue(commentRecord());
    const svc = createPostService(deps);

    await expect(svc.updateComment(1, 5, other, 'edit')).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(deps.comments.update).not.toHaveBeenCalled();
  });

  it('rejects a comment that belongs to a different post', async () => {
    const deps = makeDeps();
    vi.mocked(deps.posts.findById).mockResolvedValue(postRecord());
    vi.mocked(deps.comments.findById).mockResolvedValue(commentRecord({ postId: 2 }));
    const svc = createPostService(deps);

    await expect(svc.updateComment(1, 5, owner, 'edit')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
