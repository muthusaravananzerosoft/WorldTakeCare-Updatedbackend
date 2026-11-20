/** Member–Guide connection request domain types. */

export const CONNECTION_STATUSES = ['pending', 'accepted', 'declined'] as const;
export type ConnectionStatus = (typeof CONNECTION_STATUSES)[number];

export type ConnectionRequesterRole = 'member' | 'guide';

export interface ConnectionRecord {
  id: number;
  /** NULL = direct member↔guide request without a trip. */
  tripId: number | null;
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

/** List/detail row — base record joined with trip + user display info. */
export interface ConnectionDetail extends ConnectionRecord {
  tripDestination: {
    id: number;
    name: string;
    countryCode: string | null;
    countryName: string | null;
  } | null;
  member: ConnectionParty;
  guide: ConnectionParty;
}

/** Public user info embedded in connection responses — never expose more. */
export interface ConnectionParty {
  id: number;
  firstName: string;
  lastName: string;
}

/** Validated POST /connections body — exactly one of guideId/memberId; tripId optional. */
export interface CreateConnectionInput {
  tripId?: number | undefined;
  guideId?: number;
  memberId?: number;
}

export type ConnectionListType = 'sent' | 'received' | 'all';

export interface ConnectionListFilters {
  status?: ConnectionStatus | undefined;
  type: ConnectionListType;
  tripId?: number | undefined;
}
