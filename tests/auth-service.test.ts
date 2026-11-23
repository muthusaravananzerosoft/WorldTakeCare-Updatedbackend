import { decodeJwt } from 'jose';
import { describe, expect, it } from 'vitest';
import { USER_ROLES } from '../src/common/constants/auth.constants.js';
import type { MailMessage, MailSender } from '../src/integrations/mail/mail-sender.interface.js';
import type { AuthTokenType, RegisterInput, UserRecord } from '../src/entities/auth.types.js';
import type {
  AuthTokenRow,
  RefreshTokenRow,
  TokenRepository,
} from '../src/repositories/token.repository.js';
import type { CreateUserData, UserRepository } from '../src/repositories/user.repository.js';
import { createAuthService } from '../src/services/auth.service.js';
import { verifyAccessToken } from '../src/services/jwt.service.js';

// ---- In-memory fakes ---------------------------------------------------

function fakeUsers() {
  const rows: UserRecord[] = [];
  const users: UserRepository = {
    async findByEmail(email) {
      return rows.find((r) => r.email === email) ?? null;
    },
    async findById(id) {
      return rows.find((r) => r.id === id) ?? null;
    },
    async findCountryIdByCode() {
      return 231;
    },
    async create(data: CreateUserData) {
      const user: UserRecord = {
        id: rows.length + 1,
        email: data.email,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        status: 'pending',
      };
      rows.push(user);
      return user;
    },
    async setActive(id) {
      const row = rows.find((r) => r.id === id);
      if (row) row.status = 'active';
    },
    async updatePassword(id, hash) {
      const row = rows.find((r) => r.id === id);
      if (row) row.passwordHash = hash;
    },
    async updateEmail(id, email) {
      const row = rows.find((r) => r.id === id);
      if (row) row.email = email;
    },
    async touchLastLogin() {},
  };
  return { users, rows };
}

function fakeTokens() {
  const refresh: (RefreshTokenRow & { tokenHash: string })[] = [];
  const auth: (AuthTokenRow & { tokenHash: string })[] = [];
  const tokens: TokenRepository = {
    async createRefreshToken(userId, tokenHash, expiresAt) {
      const id = refresh.length + 1;
      refresh.push({ id, userId, tokenHash, expiresAt, revokedAt: null });
      return id;
    },
    async findRefreshTokenByHash(hash) {
      return refresh.find((r) => r.tokenHash === hash) ?? null;
    },
    async revokeRefreshToken(id) {
      const row = refresh.find((r) => r.id === id);
      if (row) row.revokedAt = new Date();
    },
    async revokeAllRefreshTokens(userId) {
      for (const r of refresh) if (r.userId === userId) r.revokedAt = new Date();
    },
    async createAuthToken(userId, type: AuthTokenType, tokenHash, expiresAt) {
      auth.push({ id: auth.length + 1, userId, type, tokenHash, expiresAt, usedAt: null });
    },
    async findAuthTokenByHash(hash) {
      return auth.find((r) => r.tokenHash === hash) ?? null;
    },
    async markAuthTokenUsed(id) {
      const row = auth.find((r) => r.id === id);
      if (row) row.usedAt = new Date();
    },
  };
  return { tokens, refresh, auth };
}

function fakeMail() {
  const sent: MailMessage[] = [];
  const mail: MailSender = { send: async (m) => void sent.push(m) };
  return { mail, sent };
}

const REGISTER: RegisterInput = {
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  password: 'Passw0rd!x',
  sex: 'male',
  dob: '1998-05-14',
  countryCode: 'IN',
  role: 'guide',
};

function extractToken(mailText: string | undefined): string {
  const token = /token=([0-9a-f]{64})/.exec(mailText ?? '')?.[1];
  if (!token) throw new Error('No token found in mail text');
  return token;
}

// ---- Tests -------------------------------------------------------------

describe('auth service', () => {
  it('registers a pending user, hashes the password and sends the activation mail', async () => {
    const { users, rows } = fakeUsers();
    const { tokens } = fakeTokens();
    const { mail, sent } = fakeMail();
    const svc = createAuthService({ users, tokens, mail });

    const res = await svc.register({ ...REGISTER }, '1.2.3.4');

    expect(res.message).toContain('activate');
    expect(rows[0]!.status).toBe('pending');
    expect(rows[0]!.role).toBe(USER_ROLES.GUIDE);
    expect(rows[0]!.passwordHash).not.toBe(REGISTER.password);
    expect(rows[0]!.passwordHash).toContain('argon2');
    expect(sent).toHaveLength(1);
    expect(sent[0]!.to).toBe(REGISTER.email);
  });

  it('rejects a duplicate email with EMAIL_TAKEN', async () => {
    const { users } = fakeUsers();
    const { tokens } = fakeTokens();
    const { mail } = fakeMail();
    const svc = createAuthService({ users, tokens, mail });

    await svc.register({ ...REGISTER });
    await expect(svc.register({ ...REGISTER })).rejects.toMatchObject({
      statusCode: 409,
      code: 'EMAIL_TAKEN',
    });
  });

  it('blocks login before activation and allows it after', async () => {
    const { users } = fakeUsers();
    const { tokens } = fakeTokens();
    const { mail, sent } = fakeMail();
    const svc = createAuthService({ users, tokens, mail });

    await svc.register({ ...REGISTER });
    await expect(
      svc.login({ email: REGISTER.email, password: REGISTER.password }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'ACCOUNT_NOT_ACTIVATED' });

    const activated = await svc.activate(extractToken(sent[0]!.text));
    // Activation already authenticates — token pair arrives with the response.
    expect(activated.tokens.accessToken).toBeTruthy();
    expect(activated.tokens.refreshToken).toHaveLength(64);
    expect(activated.user.email).toBe(REGISTER.email);

    const res = await svc.login({ email: REGISTER.email, password: REGISTER.password });
    expect(res.user.email).toBe(REGISTER.email);
    expect(res.tokens.accessToken).toBeTruthy();
    expect(res.tokens.refreshToken).toHaveLength(64);
  });

  it('returns INVALID_CREDENTIALS for wrong password', async () => {
    const { users, rows } = fakeUsers();
    const { tokens } = fakeTokens();
    const { mail, sent } = fakeMail();
    const svc = createAuthService({ users, tokens, mail });

    await svc.register({ ...REGISTER });
    await svc.activate(extractToken(sent[0]!.text));
    rows[0]!.status = 'active';
    await expect(
      svc.login({ email: REGISTER.email, password: 'wrong-pass-1' }),
    ).rejects.toMatchObject({ statusCode: 401, code: 'INVALID_CREDENTIALS' });
  });

  it('access tokens verify through verifyAccessToken and carry the role', async () => {
    const { users } = fakeUsers();
    const { tokens } = fakeTokens();
    const { mail, sent } = fakeMail();
    const svc = createAuthService({ users, tokens, mail });

    await svc.register({ ...REGISTER });
    await svc.activate(extractToken(sent[0]!.text));
    const { tokens: pair } = await svc.login({
      email: REGISTER.email,
      password: REGISTER.password,
    });

    const claims = await verifyAccessToken(pair.accessToken);
    expect(claims.id).toBe(1);
    expect(claims.role).toBe('guide');
  });

  it('issues access tokens without an exp claim (ACCESS_TOKEN_TTL_MIN=0)', async () => {
    const { users } = fakeUsers();
    const { tokens } = fakeTokens();
    const { mail, sent } = fakeMail();
    const svc = createAuthService({ users, tokens, mail });

    await svc.register({ ...REGISTER });
    const { tokens: pair } = await svc.activate(extractToken(sent[0]!.text));

    expect(decodeJwt(pair.accessToken).exp).toBeUndefined();
    expect(pair.accessTokenExpiresIn).toBeNull();
    // …and it still verifies + carries identity
    const claims = await verifyAccessToken(pair.accessToken);
    expect(claims.id).toBe(1);
  });

  it('rotates refresh tokens and revokes the session on reuse', async () => {
    const { users } = fakeUsers();
    const { tokens } = fakeTokens();
    const { mail, sent } = fakeMail();
    const svc = createAuthService({ users, tokens, mail });

    await svc.register({ ...REGISTER });
    await svc.activate(extractToken(sent[0]!.text));
    const first = await svc.login({ email: REGISTER.email, password: REGISTER.password });

    const second = await svc.refresh(first.tokens.refreshToken);
    expect(second.tokens.refreshToken).not.toBe(first.tokens.refreshToken);

    // Presenting the rotated-out token again = theft detection → all revoked.
    await expect(svc.refresh(first.tokens.refreshToken)).rejects.toMatchObject({
      statusCode: 401,
    });
    await expect(svc.refresh(second.tokens.refreshToken)).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('forgot-password always succeeds but only mails active users; reset revokes sessions', async () => {
    const { users } = fakeUsers();
    const { tokens } = fakeTokens();
    const { mail, sent } = fakeMail();
    const svc = createAuthService({ users, tokens, mail });

    // unknown email → still 200, no mail
    const res1 = await svc.forgotPassword('ghost@example.com');
    expect(res1.message).toBeTruthy();
    expect(sent).toHaveLength(0);

    await svc.register({ ...REGISTER });
    await svc.activate(extractToken(sent[0]!.text));
    const login = await svc.login({ email: REGISTER.email, password: REGISTER.password });

    await svc.forgotPassword(REGISTER.email);
    const resetToken = extractToken(sent[1]!.text);
    await svc.resetPassword(resetToken, 'NewPass123');

    // old refresh token dead; new password works
    await expect(svc.refresh(login.tokens.refreshToken)).rejects.toMatchObject({
      statusCode: 401,
    });
    const relog = await svc.login({ email: REGISTER.email, password: 'NewPass123' });
    expect(relog.user.email).toBe(REGISTER.email);
  });

  it('verifies a legacy MD5 hash once and upgrades it to Argon2', async () => {
    const { users, rows } = fakeUsers();
    const { tokens } = fakeTokens();
    const { mail } = fakeMail();
    const svc = createAuthService({ users, tokens, mail });

    // seed a legacy row: active user with md5('Passw0rd!x')
    const { createHash } = await import('node:crypto');
    const md5 = createHash('md5').update(REGISTER.password).digest('hex');
    rows.push({
      id: 1,
      email: REGISTER.email,
      passwordHash: md5,
      firstName: 'Old',
      lastName: 'Timer',
      role: USER_ROLES.MEMBER,
      status: 'active',
    });

    const res = await svc.login({ email: REGISTER.email, password: REGISTER.password });
    expect(res.user.id).toBe(1);
    expect(rows[0]!.passwordHash).toContain('argon2');
  });

  it('changePassword verifies the current password, rotates refresh tokens and keeps the caller logged in', async () => {
    const { users, rows } = fakeUsers();
    const { tokens } = fakeTokens();
    const { mail, sent } = fakeMail();
    const svc = createAuthService({ users, tokens, mail });

    await svc.register({ ...REGISTER });
    await svc.activate(extractToken(sent[0]!.text));
    const login = await svc.login({ email: REGISTER.email, password: REGISTER.password });

    const res = await svc.changePassword(1, REGISTER.email, REGISTER.password, 'NewPass123');

    // new hash stored, old refresh tokens revoked, fresh pair returned
    expect(rows[0]!.passwordHash).toContain('argon2');
    await expect(svc.refresh(login.tokens.refreshToken)).rejects.toMatchObject({
      statusCode: 401,
    });
    expect(res.tokens.accessToken).toBeTruthy();
    expect(res.tokens.refreshToken).toHaveLength(64);
    expect(res.user.email).toBe(REGISTER.email);
    await expect(svc.login({ email: REGISTER.email, password: 'NewPass123' })).resolves.toBeTruthy();
  });

  it('changePassword updates the email alongside the password and rejects a taken one', async () => {
    const { users, rows } = fakeUsers();
    const { tokens } = fakeTokens();
    const { mail, sent } = fakeMail();
    const svc = createAuthService({ users, tokens, mail });

    await svc.register({ ...REGISTER });
    await svc.activate(extractToken(sent[0]!.text));

    const res = await svc.changePassword(1, 'new.mail@example.com', REGISTER.password, 'NewPass123');
    expect(rows[0]!.email).toBe('new.mail@example.com');
    expect(res.user.email).toBe('new.mail@example.com');
    await expect(
      svc.login({ email: 'new.mail@example.com', password: 'NewPass123' }),
    ).resolves.toBeTruthy();

    // second account exists → email is taken
    await svc.register({ ...REGISTER, email: 'other@example.com' });
    await expect(
      svc.changePassword(1, 'other@example.com', 'NewPass123', 'OtherPass9'),
    ).rejects.toMatchObject({ statusCode: 409, code: 'EMAIL_TAKEN' });
    expect(rows[0]!.email).toBe('new.mail@example.com');
  });

  it('changePassword rejects a wrong current password without touching anything', async () => {
    const { users, rows } = fakeUsers();
    const { tokens } = fakeTokens();
    const { mail, sent } = fakeMail();
    const svc = createAuthService({ users, tokens, mail });

    await svc.register({ ...REGISTER });
    await svc.activate(extractToken(sent[0]!.text));
    const hashBefore = rows[0]!.passwordHash;

    await expect(
      svc.changePassword(1, REGISTER.email, 'wrong-pass-1', 'NewPass123'),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_CREDENTIALS',
    });
    expect(rows[0]!.passwordHash).toBe(hashBefore);
  });

  it('changePassword rejects the same password as the new one', async () => {
    const { users } = fakeUsers();
    const { tokens } = fakeTokens();
    const { mail, sent } = fakeMail();
    const svc = createAuthService({ users, tokens, mail });

    await svc.register({ ...REGISTER });
    await svc.activate(extractToken(sent[0]!.text));

    await expect(
      svc.changePassword(1, REGISTER.email, REGISTER.password, REGISTER.password),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
