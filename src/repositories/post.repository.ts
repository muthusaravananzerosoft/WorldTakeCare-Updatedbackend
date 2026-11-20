import { databaseClient } from '../database/client.js';
import type {
  CommentRecord,
  CreatePostInput,
  PostRecord,
  UpdatePostInput,
} from '../entities/post.types.js';
import type { Page, PageRequest } from './repository.interface.js';

export interface PostRepository {
  create(userId: number, input: CreatePostInput, readingTimeMin: number): Promise<PostRecord>;
  findById(id: number): Promise<PostRecord | null>;
  findPage(request: PageRequest): Promise<Page<PostRecord>>;
  update(id: number, input: UpdatePostInput, readingTimeMin?: number): Promise<PostRecord | null>;
  delete(id: number): Promise<boolean>;
}

export interface CommentRepository {
  create(postId: number, userId: number, comment: string): Promise<CommentRecord>;
  findById(id: number): Promise<CommentRecord | null>;
  findPageByPost(postId: number, request: PageRequest): Promise<Page<CommentRecord>>;
  update(id: number, comment: string): Promise<CommentRecord | null>;
  delete(id: number): Promise<boolean>;
}

interface PostRow {
  post_id: number;
  user_id: number;
  title: string;
  description: string;
  image_url: string | null;
  published_date: string;
  reading_time_min: number;
  created_at: Date;
  updated_at: Date;
  fname: string | null;
  lname: string | null;
  comment_count: number;
}

interface CommentRow {
  comment_id: number;
  post_id: number;
  user_id: number;
  comment: string;
  created_at: Date;
  updated_at: Date;
  fname: string | null;
  lname: string | null;
}

const POST_SELECT = `SELECT p.post_id, p.user_id, p.title, p.description, p.image_url,
    DATE_FORMAT(p.published_date, '%Y-%m-%d') AS published_date,
    p.reading_time_min, p.created_at, p.updated_at,
    u.fname, u.lname,
    (SELECT COUNT(*) FROM post_comments c WHERE c.post_id = p.post_id) AS comment_count
  FROM posts p
  LEFT JOIN user u ON u.use_id = p.user_id`;

const COMMENT_SELECT = `SELECT c.comment_id, c.post_id, c.user_id, c.comment,
    c.created_at, c.updated_at, u.fname, u.lname
  FROM post_comments c
  LEFT JOIN user u ON u.use_id = c.user_id`;

function mapPost(row: PostRow): PostRecord {
  return {
    id: row.post_id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    imageUrl: row.image_url,
    publishedDate: row.published_date,
    readingTimeMin: row.reading_time_min,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    authorFirstName: row.fname,
    authorLastName: row.lname,
    commentCount: Number(row.comment_count),
  };
}

function mapComment(row: CommentRow): CommentRecord {
  return {
    id: row.comment_id,
    postId: row.post_id,
    userId: row.user_id,
    comment: row.comment,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    authorFirstName: row.fname,
    authorLastName: row.lname,
  };
}

const POST_FIELD_TO_COLUMN: Record<string, string> = {
  title: 'title',
  description: 'description',
  imageUrl: 'image_url',
  publishedDate: 'published_date',
};

export const postRepository: PostRepository = {
  async create(userId, input, readingTimeMin): Promise<PostRecord> {
    const result = await databaseClient.execute(
      `INSERT INTO posts (user_id, title, description, image_url, published_date, reading_time_min)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        input.title,
        input.description,
        input.imageUrl ?? null,
        input.publishedDate,
        readingTimeMin,
      ],
    );
    const record = await this.findById(Number(result.insertId));
    if (!record) throw new Error('Post insert failed');
    return record;
  },

  async findById(id): Promise<PostRecord | null> {
    const rows = await databaseClient.query<PostRow>(`${POST_SELECT} WHERE p.post_id = ?`, [id]);
    return rows[0] ? mapPost(rows[0]) : null;
  },

  async findPage({ page, pageSize }): Promise<Page<PostRecord>> {
    const rows = await databaseClient.query<PostRow>(
      `${POST_SELECT} ORDER BY p.created_at DESC, p.post_id DESC LIMIT ? OFFSET ?`,
      [pageSize, (page - 1) * pageSize],
    );
    const totals = await databaseClient.query<{ total: number }>(
      'SELECT COUNT(*) AS total FROM posts',
    );
    return {
      items: rows.map(mapPost),
      page,
      pageSize,
      totalItems: Number(totals[0]?.total ?? 0),
    };
  },

  async update(id, input, readingTimeMin): Promise<PostRecord | null> {
    const sets: string[] = [];
    const params: (string | number | null)[] = [];
    for (const [field, column] of Object.entries(POST_FIELD_TO_COLUMN)) {
      if (field in input) {
        sets.push(`${column} = ?`);
        params.push(((input as Record<string, unknown>)[field] as string | null) ?? null);
      }
    }
    if (readingTimeMin !== undefined) {
      sets.push('reading_time_min = ?');
      params.push(readingTimeMin);
    }
    if (sets.length === 0) return this.findById(id);
    params.push(id);
    await databaseClient.execute(`UPDATE posts SET ${sets.join(', ')} WHERE post_id = ?`, params);
    return this.findById(id);
  },

  async delete(id): Promise<boolean> {
    const result = await databaseClient.execute('DELETE FROM posts WHERE post_id = ?', [id]);
    return result.affectedRows > 0;
  },
};

export const commentRepository: CommentRepository = {
  async create(postId, userId, comment): Promise<CommentRecord> {
    const result = await databaseClient.execute(
      'INSERT INTO post_comments (post_id, user_id, comment) VALUES (?, ?, ?)',
      [postId, userId, comment],
    );
    const record = await this.findById(Number(result.insertId));
    if (!record) throw new Error('Comment insert failed');
    return record;
  },

  async findById(id): Promise<CommentRecord | null> {
    const rows = await databaseClient.query<CommentRow>(
      `${COMMENT_SELECT} WHERE c.comment_id = ?`,
      [id],
    );
    return rows[0] ? mapComment(rows[0]) : null;
  },

  async findPageByPost(postId, { page, pageSize }): Promise<Page<CommentRecord>> {
    const rows = await databaseClient.query<CommentRow>(
      `${COMMENT_SELECT} WHERE c.post_id = ? ORDER BY c.created_at ASC, c.comment_id ASC LIMIT ? OFFSET ?`,
      [postId, pageSize, (page - 1) * pageSize],
    );
    const totals = await databaseClient.query<{ total: number }>(
      'SELECT COUNT(*) AS total FROM post_comments WHERE post_id = ?',
      [postId],
    );
    return {
      items: rows.map(mapComment),
      page,
      pageSize,
      totalItems: Number(totals[0]?.total ?? 0),
    };
  },

  async update(id, comment): Promise<CommentRecord | null> {
    const result = await databaseClient.execute(
      'UPDATE post_comments SET comment = ? WHERE comment_id = ?',
      [comment, id],
    );
    if (result.affectedRows === 0) return null;
    return this.findById(id);
  },

  async delete(id): Promise<boolean> {
    const result = await databaseClient.execute(
      'DELETE FROM post_comments WHERE comment_id = ?',
      [id],
    );
    return result.affectedRows > 0;
  },
};
