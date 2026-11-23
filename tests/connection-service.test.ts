import { describe, expect, it, vi } from 'vitest';
import type { ConnectionDetail, ConnectionRecord } from '../src/entities/connection.types.js';
import type { UserRecord } from '../src/entities/auth.types.js';
import type { ConnectionRepository } from '../src/repositories/connection.repository.js';
import type { Page, PageRequest } from '../src/repositories/repository.interface.js';
import { createConnectionService, type ConnectionServiceDeps } from '../src/services/connection.service.js';

const member = { id: 12, role: 'member' as const };
const guide = { id: 25, role: 'guide' as const };

function connectionRecord(overrides: Partial<ConnectionRecord> = {}): ConnectionRecord {
  return {
    id: 1,
    memberId: 12,
    guideId: 25,
    requesterUserId: 12,
    recipientUserId: 25,
    requesterRole: 'member',
    status: 'pending',
    requestedAt: '2026-11-20T10:00:00.000Z',
    respondedAt: null,
    createdAt: '2026-11-20T10:00:00.000Z',
    updatedAt: '2026-11-20T10:00:00.000Z',
    ...overrides,
  };
}

function connectionDetail(overrides: Partial<ConnectionDetail> = {}): ConnectionDetail {
  return {
    ...connectionRecord(),
    member: { id: 12, firstName: 'Mem', lastName: 'Ber' },
    guide: { id: 25, firstName: 'Gui', lastName: 'De' },
    ...overrides,
  };
}

function userRecord(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    id: 25,
    email: 'u@x.com',
    passwordHash: 'h',
    firstName: 'Gui',
    lastName: 'De',
    role: 'guide',
    status: 'active',
    ...overrides,
  };
}

function makeDeps(): ConnectionServiceDeps {
  const emptyPage = <T,>({ page, pageSize }: PageRequest): Page<T> => ({
    items: [],
    page,
    pageSize,
    totalItems: 0,
  });
  const connections: ConnectionRepository = {
    create: vi.fn(async () => connectionRecord()),
    findById: vi.fn(async () => null),
    findDetailById: vi.fn(async () => connectionDetail()),
    findByPair: vi.fn(async () => null),
    reopen: vi.fn(async () => connectionRecord({ status: 'pending' })),
    setStatus: vi.fn(async (_id, status) => connectionRecord({ status })),
    findPageByUser: vi.fn<ConnectionRepository['findPageByUser']>(async (_u, _f, r) =>
      emptyPage<ConnectionDetail>(r),
    ),
  };
  return {
    connections,
    users: {
      findByEmail: vi.fn(async () => null),
      findById: vi.fn(async () => userRecord()),
      findCountryIdByCode: vi.fn(async () => null),
      create: vi.fn(),
      setActive: vi.fn(),
      updatePassword: vi.fn(),
      updateEmail: vi.fn(),
      touchLastLogin: vi.fn(),
    },
  };
}

describe('connectionService.create — member → guide', () => {
  it('stores a pending request addressed to the guide', async () => {
    const deps = makeDeps();
    const svc = createConnectionService(deps);

    const res = await svc.create(member, { guideId: 25 });

    expect(deps.connections.create).toHaveBeenCalledWith({
      memberId: 12,
      guideId: 25,
      requesterUserId: 12,
      recipientUserId: 25,
      requesterRole: 'member',
    });
    expect(res.status).toBe('pending');
  });

  it('rejects when the sender is not a member', async () => {
    const svc = createConnectionService(makeDeps());

    await expect(svc.create(guide, { guideId: 30 })).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('rejects when the guide id is not a guide-role user', async () => {
    const deps = makeDeps();
    vi.mocked(deps.users.findById).mockResolvedValue(userRecord({ role: 'member' }));
    const svc = createConnectionService(deps);

    await expect(svc.create(member, { guideId: 30 })).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('rejects when the guide is not an active account', async () => {
    const deps = makeDeps();
    vi.mocked(deps.users.findById).mockResolvedValue(userRecord({ status: 'pending' }));
    const svc = createConnectionService(deps);

    await expect(svc.create(member, { guideId: 30 })).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('rejects a self-request', async () => {
    const svc = createConnectionService(makeDeps());

    await expect(svc.create(member, { guideId: 12 })).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});

describe('connectionService.create — guide → member', () => {
  it('stores a pending request addressed to the member', async () => {
    const deps = makeDeps();
    vi.mocked(deps.users.findById).mockResolvedValue(userRecord({ id: 12, role: 'member' }));
    const svc = createConnectionService(deps);

    await svc.create(guide, { memberId: 12 });

    expect(deps.connections.create).toHaveBeenCalledWith({
      memberId: 12,
      guideId: 25,
      requesterUserId: 25,
      recipientUserId: 12,
      requesterRole: 'guide',
    });
  });

  it('rejects when the sender is not a guide', async () => {
    const svc = createConnectionService(makeDeps());
    await expect(svc.create(member, { memberId: 40 })).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('rejects when the member id is not a member-role user', async () => {
    const svc = createConnectionService(makeDeps());
    await expect(svc.create(guide, { memberId: 55 })).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('connectionService.create — duplicates', () => {
  it('conflicts on an existing pending request (either direction)', async () => {
    const deps = makeDeps();
    vi.mocked(deps.connections.findByPair).mockResolvedValue(connectionRecord());
    const svc = createConnectionService(deps);

    await expect(svc.create(member, { guideId: 25 })).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('conflicts when the pair is already connected', async () => {
    const deps = makeDeps();
    vi.mocked(deps.connections.findByPair).mockResolvedValue(
      connectionRecord({ status: 'accepted' }),
    );
    const svc = createConnectionService(deps);

    await expect(svc.create(member, { guideId: 25 })).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('re-opens a declined request instead of inserting a duplicate', async () => {
    const deps = makeDeps();
    vi.mocked(deps.connections.findByPair).mockResolvedValue(
      connectionRecord({ status: 'declined' }),
    );
    const svc = createConnectionService(deps);

    await svc.create(member, { guideId: 25 });

    expect(deps.connections.reopen).toHaveBeenCalledWith(1, 12, 25, 'member');
    expect(deps.connections.create).not.toHaveBeenCalled();
  });
});

describe('connectionService.respond', () => {
  it('lets the recipient accept', async () => {
    const deps = makeDeps();
    vi.mocked(deps.connections.findById).mockResolvedValue(connectionRecord());
    const svc = createConnectionService(deps);

    await svc.respond(1, 25, 'accept');
    expect(deps.connections.setStatus).toHaveBeenCalledWith(1, 'accepted');
  });

  it('rejects a non-recipient response', async () => {
    const deps = makeDeps();
    vi.mocked(deps.connections.findById).mockResolvedValue(connectionRecord());
    const svc = createConnectionService(deps);

    await expect(svc.respond(1, 99, 'accept')).rejects.toMatchObject({ statusCode: 404 });
    expect(deps.connections.setStatus).not.toHaveBeenCalled();
  });

  it('rejects responding to an already-answered request', async () => {
    const deps = makeDeps();
    vi.mocked(deps.connections.findById).mockResolvedValue(
      connectionRecord({ status: 'accepted' }),
    );
    const svc = createConnectionService(deps);

    await expect(svc.respond(1, 25, 'accept')).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('connectionService.getById', () => {
  it('lets a party read the connection', async () => {
    const svc = createConnectionService(makeDeps());
    const res = await svc.getById(1, 12);
    expect(res.member.id).toBe(12);
  });

  it('hides the connection from unrelated users', async () => {
    const svc = createConnectionService(makeDeps());
    await expect(svc.getById(1, 99)).rejects.toMatchObject({ statusCode: 404 });
  });
});
