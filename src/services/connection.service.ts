import { USER_ROLES } from '../common/constants/auth.constants.js';
import { AppError } from '../common/errors/app-error.js';
import type { AuthUser } from '../middleware/auth.middleware.js';
import type {
  ConnectionDetail,
  ConnectionListFilters,
  CreateConnectionInput,
} from '../entities/connection.types.js';
import type { PageRequest } from '../repositories/repository.interface.js';
<<<<<<< HEAD
=======
import type { TripRepository } from '../repositories/trip.repository.js';
import { tripRepository } from '../repositories/trip.repository.js';
>>>>>>> 0109527d6de84cac509d4ead8a7bb60c699937f7
import type { UserRepository } from '../repositories/user.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import type { ConnectionRepository } from '../repositories/connection.repository.js';
import { connectionRepository } from '../repositories/connection.repository.js';

export interface ConnectionServiceDeps {
  connections: ConnectionRepository;
<<<<<<< HEAD
=======
  trips: TripRepository;
>>>>>>> 0109527d6de84cac509d4ead8a7bb60c699937f7
  users: UserRepository;
}

export function createConnectionService(deps: ConnectionServiceDeps) {
<<<<<<< HEAD
  const { connections, users } = deps;
=======
  const { connections, trips, users } = deps;
>>>>>>> 0109527d6de84cac509d4ead8a7bb60c699937f7

  const requireDetail = async (id: number): Promise<ConnectionDetail> => {
    const detail = await connections.findDetailById(id);
    if (!detail) throw AppError.notFound('Connection not found');
    return detail;
  };

  /** Active user of a given role, or notFound — inactive/deleted users can't connect. */
  const requireActiveRoleUser = async (id: number, role: string, label: string) => {
    const user = await users.findById(id);
    if (!user || user.role !== role || user.status !== 'active') {
      throw AppError.notFound(`${label} not found`);
    }
    return user;
  };

  return {
    /**
<<<<<<< HEAD
     * Both directions land here. The pair key (member, guide) is
=======
     * Both directions land here. The pair key (trip, member, guide) is
>>>>>>> 0109527d6de84cac509d4ead8a7bb60c699937f7
     * direction-agnostic, so a pending row in EITHER direction blocks a new
     * request. A declined row is re-opened in place — re-requesting after a
     * decline is allowed (documented behavior).
     */
    async create(requester: AuthUser, input: CreateConnectionInput): Promise<ConnectionDetail> {
<<<<<<< HEAD
=======
      // tripId is optional — when given we only check it exists (FK validity);
      // trip ownership is NOT required to connect member↔guide.
      if (input.tripId !== undefined) {
        const trip = await trips.findById(input.tripId);
        if (!trip) throw AppError.notFound('Trip not found');
      }

>>>>>>> 0109527d6de84cac509d4ead8a7bb60c699937f7
      let memberId: number;
      let guideId: number;
      let recipientUserId: number;
      let requesterRole: 'member' | 'guide';

      if (input.guideId !== undefined) {
        // Member → Guide: sender must be a member; guideId an active guide.
        if (requester.role !== USER_ROLES.MEMBER) {
          throw AppError.forbidden('Only members can send requests to guides');
        }
        if (input.guideId === requester.id) {
          throw AppError.badRequest('You cannot send a connection request to yourself');
        }
        await requireActiveRoleUser(input.guideId, USER_ROLES.GUIDE, 'Guide');
        memberId = requester.id;
        guideId = input.guideId;
        recipientUserId = input.guideId;
        requesterRole = 'member';
      } else {
        // Guide → Member: sender must be a guide; memberId an active member.
        if (requester.role !== USER_ROLES.GUIDE) {
          throw AppError.forbidden('Only guides can send requests to members');
        }
        const memberIdInput = input.memberId!;
        await requireActiveRoleUser(memberIdInput, USER_ROLES.MEMBER, 'Member');
        if (memberIdInput === requester.id) {
          throw AppError.badRequest('You cannot send a connection request to yourself');
        }
        memberId = memberIdInput;
        guideId = requester.id;
        recipientUserId = memberIdInput;
        requesterRole = 'guide';
      }

<<<<<<< HEAD
      const existing = await connections.findByPair(memberId, guideId);
      if (existing?.status === 'pending') {
        throw AppError.conflict('A pending connection request already exists');
      }
      if (existing?.status === 'accepted') {
        throw AppError.conflict('Member and guide are already connected');
=======
      const existing = await connections.findByPair(input.tripId ?? null, memberId, guideId);
      if (existing?.status === 'pending') {
        throw AppError.conflict('A pending connection request already exists for this trip');
      }
      if (existing?.status === 'accepted') {
        throw AppError.conflict('Member and guide are already connected for this trip');
>>>>>>> 0109527d6de84cac509d4ead8a7bb60c699937f7
      }
      if (existing) {
        // Declined → re-open the same row as a fresh pending request.
        await connections.reopen(existing.id, requester.id, recipientUserId, requesterRole);
        return requireDetail(existing.id);
      }

      const created = await connections.create({
<<<<<<< HEAD
=======
        tripId: input.tripId ?? null,
>>>>>>> 0109527d6de84cac509d4ead8a7bb60c699937f7
        memberId,
        guideId,
        requesterUserId: requester.id,
        recipientUserId,
        requesterRole,
      });
      return requireDetail(created.id);
    },

    async respond(id: number, userId: number, action: 'accept' | 'decline'): Promise<ConnectionDetail> {
      const connection = await connections.findById(id);
      // 404 for unrelated users — don't leak that the connection exists.
      if (!connection || connection.recipientUserId !== userId) {
        throw AppError.notFound('Connection not found');
      }
      if (connection.status !== 'pending') {
        throw AppError.conflict(`This request was already ${connection.status}`);
      }
      await connections.setStatus(id, action === 'accept' ? 'accepted' : 'declined');
      return requireDetail(id);
    },

    async list(userId: number, filters: ConnectionListFilters, request: PageRequest) {
      const page = await connections.findPageByUser(userId, filters, request);
      return {
        connections: page.items,
        page: page.page,
        limit: page.pageSize,
        total: page.totalItems,
        totalPages: Math.ceil(page.totalItems / page.pageSize),
      };
    },

    async getById(id: number, userId: number): Promise<ConnectionDetail> {
      const detail = await requireDetail(id);
      if (detail.memberId !== userId && detail.guideId !== userId) {
        throw AppError.notFound('Connection not found');
      }
      return detail;
    },
  };
}

export type ConnectionService = ReturnType<typeof createConnectionService>;

export const connectionService = createConnectionService({
  connections: connectionRepository,
<<<<<<< HEAD
=======
  trips: tripRepository,
>>>>>>> 0109527d6de84cac509d4ead8a7bb60c699937f7
  users: userRepository,
});
