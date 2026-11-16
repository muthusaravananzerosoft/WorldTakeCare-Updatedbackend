/**
 * Role names carried in access-token claims. `member` is the default account
 * role; `admin` maps to the legacy back-office users (`user.roles`/`/wt/`).
 */
export const USER_ROLES = {
  MEMBER: 'member',
  ADMIN: 'admin',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
