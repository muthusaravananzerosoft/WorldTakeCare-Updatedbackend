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
  traits?: ProfileTrait[];
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
  traits: ProfileTrait[];
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
