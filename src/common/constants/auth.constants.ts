/**
 * Role names carried in access-token claims and stored in `user.role`.
 * `user` is the default member role; `guide` is the new travel-guide role
 * chosen at registration; `admin` maps to the legacy back-office (`/wt/`).
 * `admin` is never selectable through the public API.
 */
export const USER_ROLES = {
  USER: 'user',
  GUIDE: 'guide',
  ADMIN: 'admin',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

/** Roles a member may self-select at registration (admin is excluded on purpose). */
export const REGISTRABLE_ROLES = [USER_ROLES.USER, USER_ROLES.GUIDE] as const;

export type RegistrableRole = (typeof REGISTRABLE_ROLES)[number];
