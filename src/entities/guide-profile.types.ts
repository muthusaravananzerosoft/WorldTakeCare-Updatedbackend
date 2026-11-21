/** Guide profile domain types. */

export const VERIFICATION_STATUSES = ['unverified', 'pending', 'verified', 'rejected'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const PROFILE_STATUSES = ['draft', 'published', 'suspended'] as const;
export type ProfileStatus = (typeof PROFILE_STATUSES)[number];

export interface TourPreferences {
  privateTours?: boolean;
  groupTours?: boolean;
  typicalDuration?: string;
  maxGroupSize?: number;
}

export interface HourlyRate {
  amount: number;
  currency: string;
}

/** Columns actually stored in guide_profiles. */
export interface GuideProfileRecord {
  id: number;
  userId: number;
  headline: string | null;
  bio: string | null;
  baseCity: string | null;
  countryCode: string | null;
  guidingAreas: string[] | null;
  languages: string[] | null;
  yearsOfExperience: number | null;
  specialties: string[] | null;
  certificationTitle: string | null;
  tourPreferences: TourPreferences | null;
  hourlyRate: HourlyRate | null;
  contactPhone: string | null;
  website: string | null;
  coverImageUrl: string | null;
  profileImageUrl: string | null;
  verificationStatus: VerificationStatus;
  profileStatus: ProfileStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Validated PATCH /guides/me/profile body. Presence semantics:
 *  - key absent      → leave column unchanged
 *  - key = null      → clear column to NULL
 *  - key = []        → clear array column (stored as NULL)
 *  - key = value     → write value
 * firstName/lastName are written to `user.fname`/`user.lname` in the same tx.
 */
export interface GuideProfilePatchInput {
  firstName?: string | undefined;
  lastName?: string | undefined;
  headline?: string | null | undefined;
  bio?: string | null | undefined;
  baseCity?: string | null | undefined;
  countryCode?: string | null | undefined;
  guidingAreas?: string[] | null | undefined;
  languages?: string[] | null | undefined;
  yearsOfExperience?: number | null | undefined;
  specialties?: string[] | null | undefined;
  certificationTitle?: string | null | undefined;
  tourPreferences?: TourPreferences | null | undefined;
  hourlyRate?: HourlyRate | null | undefined;
  contactPhone?: string | null | undefined;
  website?: string | null | undefined;
}

/** API response — profile joined with the user's name. */
export interface GuideProfileResult {
  firstName: string;
  lastName: string;
  headline: string | null;
  bio: string | null;
  baseCity: string | null;
  countryCode: string | null;
  guidingAreas: string[] | null;
  languages: string[] | null;
  yearsOfExperience: number | null;
  specialties: string[] | null;
  certificationTitle: string | null;
  tourPreferences: TourPreferences | null;
  hourlyRate: HourlyRate | null;
  contactPhone: string | null;
  website: string | null;
  coverImage: { url: string } | null;
  profileImage: { url: string } | null;
  verificationStatus: VerificationStatus;
  profileStatus: ProfileStatus;
  /** Null when no profile row exists yet (empty shell response). */
  updatedAt: string | null;
}
