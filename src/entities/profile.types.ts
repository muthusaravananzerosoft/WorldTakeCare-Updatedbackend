/**
 * Member profile — the legacy account-page sections (Profile, Location,
 * Visited Countries, Country I am Visiting Now) unified into one API
 * resource backed by `user` columns + user_country_visited /
 * user_visiting_country rows.
 */

export type SexValue = 'male' | 'female';

export type MaritalStatus =
  | 'available'
  | 'seeing_someone'
  | 'complicated'
  | 'single'
  | 'married'
  | 'separated'
  | 'divorced'
  | 'widowed'
  | 'offline';

export type ProfileTrait = 'non_smoker' | 'vegetarian' | 'tourist_guide';

export type LookingToMeet = 'man' | 'woman' | 'man_or_woman' | 'other';

export const MEMBER_DISCOVERY_SORTS = ['recommended', 'newest', 'age_asc', 'age_desc'] as const;
export type MemberDiscoverySort = (typeof MEMBER_DISCOVERY_SORTS)[number];

export interface MemberDiscoveryFilters {
  q?: string | undefined;
  ageMin?: number | undefined;
  ageMax?: number | undefined;
  gender?: SexValue | undefined;
  countryCode?: string | undefined;
  stateId?: number | undefined;
  city?: string | undefined;
  language?: string | undefined;
  lookingToMeet?: LookingToMeet | undefined;
  maritalStatus?: Exclude<MaritalStatus, 'offline'> | undefined;
  raceId?: number | undefined;
  religionId?: number | undefined;
  /** Preset value (non_smoker…) or a custom trait label. */
  trait?: string | undefined;
  sort: MemberDiscoverySort;
}

export interface MemberDiscoveryRow {
  use_id: number;
  fname: string;
  lname: string;
  profile_img: string | null;
  img: string | null;
  sex: number;
  dob: number | null;
  marital_status: number;
  languages: string | null;
  other: string | null;
  looking_to_meet: string | null;
  country_id: number | null;
  country_code: string | null;
  country_name: string | null;
  state_id: number | null;
  state_name: string | null;
  city: string | null;
}

export interface MemberDiscoveryCard {
  id: number;
  firstName: string;
  lastName: string;
  gender: SexValue | null;
  age: number | null;
  location: {
    country: CountryRef | null;
    state: StateRef | null;
    city: string | null;
  };
  languages: string | null;
  profileImage: string | null;
  coverImage: string | null;
  lookingToMeet: LookingToMeet | null;
  maritalStatus: MaritalStatus | null;
  traits: string[];
}

export interface NamedOption {
  id: number;
  name: string;
}

export interface CountryRef {
  id: number;
  code: string | null;
  name: string;
}

export interface StateRef {
  id: number;
  name: string;
}

// ---- Inputs (validated PUT body) ------------------------------------------

export interface LocationInput {
  countryCode?: string | null;
  stateId?: number | null;
  city?: string | null;
  zip?: string | null;
  timezone?: string | null;
}

export interface PersonalInput {
  firstName: string;
  lastName: string;
  sex?: SexValue | null;
  /** ISO date YYYY-MM-DD; must put the member at 18+. */
  dob?: string | null;
  /** ISO alpha-2 country code for Country of Birth. */
  countryOfBirth?: string | null;
  raceId?: number | null;
  /** 1–7 per RELIGION_OPTIONS; 7 requires otherReligion. */
  religionId?: number | null;
  otherReligion?: string | null;
  heightId?: number | null;
  maritalStatus?: MaritalStatus;
  educationId?: number | null;
  languages?: string | null;
  /** Preset values and/or custom trait labels. */
  traits?: string[];
  /** ISO country codes, max MAX_NATIONALITIES. */
  nationalities?: string[];
  lookingToMeet?: LookingToMeet | null;
  lookingToMeetOther?: string | null;
  writeSomething?: string | null;
  about?: string | null;
}

export interface VisitedCountryInput {
  countryCode: string;
  stateIds: number[];
}

export interface UpdateProfileInput {
  /** Optional so a multipart PUT can carry only image changes. */
  personal?: PersonalInput;
  location?: {
    primary?: LocationInput;
    secondary?: LocationInput;
  };
  visitedCountries?: VisitedCountryInput[];
  visitingCountries?: string[];
  /** Clears user.profile_img (ignored when a new profileImage file is sent). */
  removeProfileImage?: boolean;
  /** Clears user.img — the profile cover/avatar image. */
  removeCoverImage?: boolean;
}

// ---- Output (GET response / PUT echo) -------------------------------------

export interface LocationProfile {
  country: CountryRef | null;
  state: StateRef | null;
  city: string | null;
  zip: string | null;
  timezone: string | null;
}

export interface PersonalProfile {
  firstName: string;
  lastName: string;
  sex: SexValue | null;
  /** ISO date YYYY-MM-DD. */
  dob: string | null;
  age: number | null;
  countryOfBirth: CountryRef | null;
  race: NamedOption | null;
  religion: NamedOption | null;
  otherReligion: string | null;
  height: NamedOption | null;
  maritalStatus: MaritalStatus | null;
  education: NamedOption | null;
  languages: string | null;
  traits: string[];
  nationalities: CountryRef[];
  lookingToMeet: LookingToMeet | null;
  lookingToMeetOther: string | null;
  writeSomething: string | null;
  about: string | null;
}

export interface VisitedCountry {
  country: CountryRef;
  states: StateRef[];
}

export interface MemberProfile {
  /** Absolute URL of the member's profile photo (user.profile_img). */
  profileImage: string | null;
  /** Absolute URL of the cover/avatar image shown on the profile page (user.img). */
  coverImage: string | null;
  personal: PersonalProfile;
  location: {
    primary: LocationProfile;
    secondary: LocationProfile;
  };
  visitedCountries: VisitedCountry[];
  visitingCountries: CountryRef[];
}

/** Location subset shown on the public member page — zip/timezone stay private. */
export interface PublicMemberLocation {
  country: CountryRef | null;
  state: StateRef | null;
  city: string | null;
}

/**
 * Public member detail (GET /users/:id) — the member profile minus private
 * fields: `age` is exposed instead of `dob`; zip and timezone are omitted.
 * 404 for inactive, deleted, suspended, hidden or non-member rows.
 */
export interface PublicMemberProfile extends Omit<PersonalProfile, 'dob'> {
  id: number;
  username: string | null;
  /** True when the member has a row in online_users (legacy online dot). */
  online: boolean;
  profileImage: string | null;
  coverImage: string | null;
  location: {
    primary: PublicMemberLocation;
    secondary: PublicMemberLocation;
  };
  visitedCountries: VisitedCountry[];
  visitingCountries: CountryRef[];
}

/** One card in the public newest-members listing (homepage). */
export interface MemberListItem {
  id: number;
  username: string | null;
  firstName: string;
  lastName: string;
  sex: SexValue | null;
  /** Computed from dob; null when dob is unset. */
  age: number | null;
  country: CountryRef | null;
  /** Absolute URL of user.profile_img; null when no photo uploaded. */
  profileImage: string | null;
  /** True when the member has a row in online_users (legacy online dot). */
  online: boolean;
}

// ---- Reference options -----------------------------------------------------

export interface ValueOption<V extends string = string> {
  id: number;
  value: V;
  label: string;
}

export interface ReferenceOptions {
  countries: CountryRef[];
  races: NamedOption[];
  heights: NamedOption[];
  educations: NamedOption[];
  religions: NamedOption[];
  maritalStatuses: ValueOption<MaritalStatus>[];
  sexOptions: ValueOption<SexValue>[];
  traits: ValueOption<ProfileTrait>[];
  lookingToMeetOptions: { value: LookingToMeet; label: string }[];
}
