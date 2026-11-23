/** Member–Guide connection request domain types. */

export const CONNECTION_STATUSES = ['pending', 'accepted', 'declined'] as const;
export type ConnectionStatus = (typeof CONNECTION_STATUSES)[number];

export type ConnectionRequesterRole = 'member' | 'guide';

export interface ConnectionRecord {
  id: number;
  memberId: number;
  guideId: number;
  requesterUserId: number;
  recipientUserId: number;
  requesterRole: ConnectionRequesterRole;
  status: ConnectionStatus;
  requestedAt: string;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** List/detail row — base record joined with member/guide display info. */
export interface ConnectionDetail extends ConnectionRecord {
  member: ConnectionParty;
  guide: ConnectionParty;
}

/** Public user info embedded in connection responses — never expose more. */
export interface ConnectionParty {
  id: number;
  firstName: string;
  lastName: string;
}

/** Validated POST /connections body — exactly one of guideId/memberId. */
export interface CreateConnectionInput {
  guideId?: number;
  memberId?: number;
}

export type ConnectionListType = 'sent' | 'received' | 'all';

export interface ConnectionListFilters {
  status?: ConnectionStatus | undefined;
  type: ConnectionListType;
}
