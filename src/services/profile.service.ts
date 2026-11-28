import { randomUUID } from 'node:crypto';
import { AppError } from '../common/errors/app-error.js';
import {
  LOOKING_TO_MEET_OPTIONS,
  RELIGION_OTHER_ID,
  maritalStatusId,
  maritalStatusValue,
  religionOption,
  sexId,
  sexValue,
  traitId,
  traitValue,
} from '../common/constants/profile.constants.js';
import type {
  CountryRef,
  LocationInput,
  LocationProfile,
  MemberDiscoveryCard,
  MemberDiscoveryFilters,
  MemberListItem,
  MemberProfile,
  PersonalInput,
  ProfileTrait,
  PublicMemberLocation,
  PublicMemberProfile,
  SexValue,
  UpdateProfileInput,
  VisitedCountry,
} from '../entities/profile.types.js';
import { validateImageUpload } from '../integrations/storage/image-validation.js';
import { keyFromStoredUrl } from '../integrations/storage/local-disk-storage.js';
import { localDiskStorage } from '../integrations/storage/local-disk-storage.js';
import type { MediaStorage } from '../integrations/storage/media-storage.interface.js';
import type {
  ProfileRepository,
  ProfileUserRow,
} from '../repositories/profile.repository.js';
import { profileRepository } from '../repositories/profile.repository.js';
import type { ReferenceRepository } from '../repositories/reference.repository.js';
import { referenceRepository } from '../repositories/reference.repository.js';

export interface ProfileServiceDeps {
  profiles: ProfileRepository;
  reference: ReferenceRepository;
  storage: MediaStorage;
}

/** Optional image files carried by a multipart PUT /users/me/profile. */
export interface ProfileImageFiles {
  profileImage?: Express.Multer.File | undefined;
  coverImage?: Express.Multer.File | undefined;
}

// ---- row → API mapping ------------------------------------------------------

function epochToIsoDate(epoch: number | null): string | null {
  if (!epoch) return null;
  return new Date(epoch * 1000).toISOString().slice(0, 10);
}

function calcAge(epoch: number | null): number | null {
  if (!epoch) return null;
  const birth = new Date(epoch * 1000);
  const now = new Date();
  const age =
    now.getUTCFullYear() -
    birth.getUTCFullYear() -
    (now < new Date(Date.UTC(now.getUTCFullYear(), birth.getUTCMonth(), birth.getUTCDate()))
      ? 1
      : 0);
  return age >= 0 ? age : null;
}

function mapLocation(
  conId: number | null,
  conCode: string | null,
  conName: string | null,
  staId: number | null,
  staName: string | null,
  city: string | null,
  zip: string | null,
  timezone: string | null,
): LocationProfile {
  return {
    country: conId ? { id: conId, code: conCode, name: conName ?? '' } : null,
    state: staId ? { id: staId, name: staName ?? '' } : null,
    city,
    zip,
    timezone,
  };
}

/** Legacy stores 'Man'/'Woman'/'Man or Woman'/free text in one column. */
function mapLookingToMeet(stored: string | null): {
  lookingToMeet: MemberProfile['personal']['lookingToMeet'];
  lookingToMeetOther: string | null;
} {
  if (!stored || stored === '0') return { lookingToMeet: null, lookingToMeetOther: null };
  const preset = LOOKING_TO_MEET_OPTIONS.find((o) => 'stored' in o && o.stored === stored);
  if (preset) return { lookingToMeet: preset.value, lookingToMeetOther: null };
  return { lookingToMeet: 'other', lookingToMeetOther: stored };
}

/** `blob` columns arrive as Buffer from mysql2 — always emit text. */
function blobToText(value: string | Buffer | null): string | null {
  if (value === null || value === '') return null;
  return typeof value === 'string' ? value : value.toString('utf8');
}

function mapTraits(csv: string | null): ProfileTrait[] {
  if (!csv) return [];
  return csv
    .split(',')
    .map((part) => traitValue(Number(part)))
    .filter((v): v is ProfileTrait => v !== null);
}

// ---- input → DB mapping -----------------------------------------------------

const NULLABLE_NUMBER = ['raceId', 'religionId', 'heightId', 'educationId'] as const;

export function createProfileService(deps: ProfileServiceDeps) {
  const { profiles, reference, storage } = deps;

  async function assembleProfile(userId: number): Promise<MemberProfile> {
    const row = await profiles.findProfileRow(userId);
    if (!row) throw AppError.notFound('User not found');
    return buildProfile(row, userId);
  }

  async function buildProfile(row: ProfileUserRow, userId: number): Promise<MemberProfile> {
    const nationalityIds = (row.fdob_nationality_id ?? '')
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);

    const [nationalities, visitedRows, visitingRow] = await Promise.all([
      profiles.findCountriesByIds(nationalityIds),
      profiles.findVisited(userId),
      profiles.findVisiting(userId),
    ]);

    const { lookingToMeet, lookingToMeetOther } = mapLookingToMeet(row.looking_to_meet);

    const visitedCountries = groupVisited(visitedRows);
    const visitingCountries: CountryRef[] = [];
    if (visitingRow) {
      if (visitingRow.fcon1_id && visitingRow.c1_name) {
        visitingCountries.push({
          id: visitingRow.fcon1_id,
          code: visitingRow.c1_code,
          name: visitingRow.c1_name,
        });
      }
      if (visitingRow.fcon2_id && visitingRow.c2_name) {
        visitingCountries.push({
          id: visitingRow.fcon2_id,
          code: visitingRow.c2_code,
          name: visitingRow.c2_name,
        });
      }
    }

    return {
      profileImage: row.profile_img || null,
      coverImage: row.img || null,
      personal: {
        firstName: row.fname,
        lastName: row.lname,
        sex: sexValue(row.sex) as MemberProfile['personal']['sex'],
        dob: epochToIsoDate(row.dob),
        age: calcAge(row.dob),
        countryOfBirth: row.fdob_con_id
          ? { id: row.fdob_con_id, code: row.cob_code, name: row.cob_name ?? '' }
          : null,
        race: row.frac_id && row.race_name ? { id: row.frac_id, name: row.race_name } : null,
        religion: religionOption(row.reli_id),
        otherReligion: row.other_religion || null,
        height:
          row.fhei_id && row.height_name ? { id: row.fhei_id, name: row.height_name } : null,
        maritalStatus: maritalStatusValue(
          row.marital_status,
        ) as MemberProfile['personal']['maritalStatus'],
        education: row.fedu_id && row.edu_name ? { id: row.fedu_id, name: row.edu_name } : null,
        languages: row.languages || null,
        traits: mapTraits(row.other),
        nationalities,
        lookingToMeet,
        lookingToMeetOther,
        writeSomething: blobToText(row.write_something),
        about: blobToText(row.about),
      },
      location: {
        primary: mapLocation(
          row.fadd1_con_id,
          row.p_con_code,
          row.p_con_name,
          row.fadd1_sta_id,
          row.p_sta_name,
          row.fadd1_cit_id,
          row.fadd1_zip_id,
          row.fadd1_tmz_id,
        ),
        secondary: mapLocation(
          row.fadd2_con_id,
          row.s_con_code,
          row.s_con_name,
          row.fadd2_sta_id,
          row.s_sta_name,
          row.fadd2_cit_id,
          row.fadd2_zip_id,
          row.fadd2_tmz_id,
        ),
      },
      visitedCountries,
      visitingCountries,
    };
  }

  function groupVisited(rows: Awaited<ReturnType<ProfileRepository['findVisited']>>) {
    const byCountry = new Map<number, VisitedCountry>();
    for (const r of rows) {
      let entry = byCountry.get(r.fcon_id);
      if (!entry) {
        entry = {
          country: { id: Number(r.fcon_id), code: r.con_code, name: r.con_name },
          states: [],
        };
        byCountry.set(r.fcon_id, entry);
      }
      if (r.fsta_id) entry.states.push({ id: Number(r.fsta_id), name: r.sta_name ?? '' });
    }
    return [...byCountry.values()];
  }

  // ---- update ---------------------------------------------------------------

  type SqlValue = string | number | null;

  function collectCountryCodes(input: UpdateProfileInput): string[] {
    const codes = new Set<string>();
    const p = input.personal;
    if (p?.countryOfBirth) codes.add(p.countryOfBirth);
    p?.nationalities?.forEach((c) => codes.add(c));
    if (input.location?.primary?.countryCode) codes.add(input.location.primary.countryCode);
    if (input.location?.secondary?.countryCode) codes.add(input.location.secondary.countryCode);
    input.visitedCountries?.forEach((v) => codes.add(v.countryCode));
    input.visitingCountries?.forEach((c) => codes.add(c));
    return [...codes];
  }

  async function resolveCountries(codes: string[]): Promise<Map<string, CountryRef>> {
    const found = await reference.findCountriesByCodes(codes);
    const map = new Map(found.filter((c) => c.code).map((c) => [c.code as string, c]));
    const missing = codes.filter((c) => !map.has(c));
    if (missing.length > 0) {
      throw AppError.badRequest('Unknown country code', { codes: missing });
    }
    return map;
  }

  const conId = (map: Map<string, CountryRef>, code: string | null | undefined): number | null =>
    code ? (map.get(code)?.id ?? null) : null;

  function personalColumns(p: PersonalInput, countries: Map<string, CountryRef>): Record<string, SqlValue> {
    const columns: Record<string, SqlValue> = {
      fname: p.firstName,
      lname: p.lastName,
    };
    if (p.sex !== undefined) columns.sex = p.sex === null ? null : (sexId(p.sex) ?? null);
    if (p.dob !== undefined) {
      columns.dob = p.dob === null ? null : Math.floor(new Date(`${p.dob}T00:00:00Z`).getTime() / 1000);
    }
    if (p.countryOfBirth !== undefined) columns.fdob_con_id = conId(countries, p.countryOfBirth);
    for (const field of NULLABLE_NUMBER) {
      if (p[field] === undefined) continue;
      columns[
        { raceId: 'frac_id', religionId: 'reli_id', heightId: 'fhei_id', educationId: 'fedu_id' }[
          field
        ]
      ] = p[field];
    }
    // Legacy clears other_religion whenever religion is not "Other".
    if (p.religionId !== undefined) {
      columns.other_religion = p.religionId === RELIGION_OTHER_ID ? (p.otherReligion ?? null) : null;
    } else if (p.otherReligion !== undefined) {
      columns.other_religion = p.otherReligion;
    }
    if (p.maritalStatus !== undefined) {
      columns.marital_status = maritalStatusId(p.maritalStatus) ?? 1;
    }
    if (p.languages !== undefined) columns.languages = p.languages;
    if (p.traits !== undefined) {
      const ids = p.traits
        .map((t) => traitId(t))
        .filter((n): n is number => n !== undefined)
        .sort((a, b) => a - b);
      columns['`other`'] = ids.length > 0 ? ids.join(',') : null;
    }
    if (p.nationalities !== undefined) {
      const ids = p.nationalities
        .map((c) => countries.get(c)?.id)
        .filter((n): n is number => n !== undefined);
      columns.fdob_nationality_id = ids.length > 0 ? ids.join(',') : null;
    }
    if (p.lookingToMeet !== undefined) {
      if (p.lookingToMeet === null) {
        columns.looking_to_meet = null;
      } else if (p.lookingToMeet === 'other') {
        columns.looking_to_meet = p.lookingToMeetOther ?? null;
      } else {
        const preset = LOOKING_TO_MEET_OPTIONS.find(
          (o): o is (typeof LOOKING_TO_MEET_OPTIONS)[number] & { stored: string } =>
            'stored' in o && o.value === p.lookingToMeet,
        );
        columns.looking_to_meet = preset?.stored ?? null;
      }
    }
    if (p.writeSomething !== undefined) columns.write_something = p.writeSomething;
    if (p.about !== undefined) columns.about = p.about;
    return columns;
  }

  function locationColumns(
    prefix: 'fadd1' | 'fadd2',
    loc: LocationInput,
    countries: Map<string, CountryRef>,
    statesByIds: Map<number, { countryId: number }>,
    /** Stored con_id used when the input doesn't resend the country. */
    fallbackCountryId: number | null,
  ): Record<string, SqlValue> {
    const columns: Record<string, SqlValue> = {};
    if (loc.countryCode !== undefined) {
      columns[`${prefix}_con_id`] = conId(countries, loc.countryCode);
    }
    if (loc.stateId !== undefined) {
      if (loc.stateId !== null) {
        const state = statesByIds.get(loc.stateId);
        const resolvedCountry =
          loc.countryCode !== undefined ? conId(countries, loc.countryCode) : fallbackCountryId;
        if (!state || (resolvedCountry !== null && state.countryId !== resolvedCountry)) {
          throw AppError.badRequest('State does not belong to the selected country', {
            field: `${prefix === 'fadd1' ? 'location.primary' : 'location.secondary'}.stateId`,
          });
        }
      }
      columns[`${prefix}_sta_id`] = loc.stateId;
    }
    if (loc.city !== undefined) columns[`${prefix}_cit_id`] = loc.city;
    if (loc.zip !== undefined) columns[`${prefix}_zip_id`] = loc.zip;
    if (loc.timezone !== undefined) columns[`${prefix}_tmz_id`] = loc.timezone;
    return columns;
  }

  /**
   * Stores or clears one image column inside the profile save. Returns the
   * new column value plus which storage keys became fresh/stale — undefined
   * when the image wasn't touched.
   */
  async function imageColumn(
    userId: number,
    file: Express.Multer.File | undefined,
    remove: boolean | undefined,
    current: string | null,
    dir: 'member-photos' | 'member-covers',
  ): Promise<{ value: string | null; storedKey: string | null; oldKey: string | null } | undefined> {
    if (!file && !remove) return undefined;
    const oldKey = keyFromStoredUrl(current);
    if (!file) return { value: null, storedKey: null, oldKey };
    const { file: image, ...type } = validateImageUpload(file);
    const key = `${dir}/${userId}/${randomUUID()}.${type.ext}`;
    const stored = await storage.put(key, image.buffer, type.mime);
    return { value: stored.url, storedKey: stored.key, oldKey };
  }

  return {
    async getProfile(userId: number) {
      return { profile: await assembleProfile(userId) };
    },

    async updateProfile(
      userId: number,
      input: UpdateProfileInput,
      files: ProfileImageFiles = {},
    ) {
      const existing = await profiles.findProfileRow(userId);
      if (!existing) throw AppError.notFound('User not found');

      const countries = await resolveCountries(collectCountryCodes(input));

      // Reference-id validation for the nullable id fields.
      if (input.personal) {
        const checks: [number | null | undefined, (id: number) => Promise<boolean>, string][] = [
          [input.personal.raceId, reference.raceExists, 'raceId'],
          [input.personal.heightId, reference.heightExists, 'heightId'],
          [input.personal.educationId, reference.educationExists, 'educationId'],
        ];
        for (const [id, exists, field] of checks) {
          if (id !== undefined && id !== null && !(await exists(id))) {
            throw AppError.badRequest(`Unknown ${field}`, { field });
          }
        }
      }

      // Collect every referenced state id (locations + visited countries).
      const stateIds = new Set<number>();
      if (input.location?.primary?.stateId) stateIds.add(input.location.primary.stateId);
      if (input.location?.secondary?.stateId) stateIds.add(input.location.secondary.stateId);
      input.visitedCountries?.forEach((v) => v.stateIds.forEach((s) => stateIds.add(s)));
      const stateRows = await reference.findStatesByIds([...stateIds]);
      const statesByIds = new Map(stateRows.map((s) => [s.id, s]));

      const columns = input.personal ? personalColumns(input.personal, countries) : {};

      if (input.location?.primary) {
        Object.assign(
          columns,
          locationColumns(
            'fadd1',
            input.location.primary,
            countries,
            statesByIds,
            existing.fadd1_con_id,
          ),
        );
      }
      if (input.location?.secondary) {
        Object.assign(
          columns,
          locationColumns(
            'fadd2',
            input.location.secondary,
            countries,
            statesByIds,
            existing.fadd2_con_id,
          ),
        );
      }

      // Visited countries — replace semantics; states must belong to their country.
      let visited: { countryId: number; stateIds: number[] }[] | undefined;
      if (input.visitedCountries !== undefined) {
        const seen = new Set<number>();
        visited = input.visitedCountries.map((v) => {
          const country = countries.get(v.countryCode)!;
          if (seen.has(country.id)) {
            throw AppError.badRequest('Duplicate country in visitedCountries', {
              code: v.countryCode,
            });
          }
          seen.add(country.id);
          const validIds = v.stateIds.map((sid) => {
            const state = statesByIds.get(sid);
            if (!state || state.countryId !== country.id) {
              throw AppError.badRequest('State does not belong to the selected country', {
                country: v.countryCode,
                stateId: sid,
              });
            }
            return sid;
          });
          return { countryId: country.id, stateIds: [...new Set(validIds)] };
        });
      }

      let visiting: number[] | undefined;
      if (input.visitingCountries !== undefined) {
        visiting = [...new Set(input.visitingCountries.map((c) => countries.get(c)!.id))];
      }

      // Profile photo + cover image — multipart files win over remove flags.
      // New files are stored before the save; old files are deleted after it.
      const photo = await imageColumn(
        userId,
        files.profileImage,
        input.removeProfileImage,
        existing.profile_img,
        'member-photos',
      );
      if (photo) columns.profile_img = photo.value;
      const cover = await imageColumn(
        userId,
        files.coverImage,
        input.removeCoverImage,
        existing.img,
        'member-covers',
      );
      if (cover) columns.img = cover.value;

      const storedKeys = [photo?.storedKey, cover?.storedKey].filter(
        (k): k is string => k !== null && k !== undefined,
      );
      const staleKeys = [photo?.oldKey, cover?.oldKey].filter(
        (k): k is string => k !== null && k !== undefined,
      );

      try {
        await profiles.saveProfile(userId, { columns, visited, visiting });
      } catch (err) {
        // Save failed — don't orphan the freshly stored files.
        for (const key of storedKeys) await storage.delete(key).catch(() => undefined);
        throw err;
      }
      for (const key of staleKeys) await storage.delete(key).catch(() => undefined);

      return { message: 'Profile updated', profile: await assembleProfile(userId) };
    },

    /**
     * Public member detail — the full profile minus private fields (dob →
     * age only, zip and timezone omitted). 404 when the row is missing or
     * not a publicly visible member.
     */
    async getPublicMember(userId: number): Promise<{ member: PublicMemberProfile }> {
      const row = await profiles.findPublicMemberRow(userId);
      if (!row) throw AppError.notFound('Member not found');
      const profile = await buildProfile(row, userId);
      const publicLocation = (loc: LocationProfile): PublicMemberLocation => ({
        country: loc.country,
        state: loc.state,
        city: loc.city,
      });
      // dob stays private — only age is exposed on the public view.
      const { dob, ...publicPersonal } = profile.personal;
      void dob;
      return {
        member: {
          id: Number(row.use_id),
          username: row.username || null,
          online: Boolean(row.online),
          profileImage: profile.profileImage,
          coverImage: profile.coverImage,
          ...publicPersonal,
          location: {
            primary: publicLocation(profile.location.primary),
            secondary: publicLocation(profile.location.secondary),
          },
          visitedCountries: profile.visitedCountries,
          visitingCountries: profile.visitingCountries,
        },
      };
    },

    /** Public homepage list — newest active members (guides/admins excluded). */
    async newestMembers(limit: number) {
      const rows = await profiles.findNewestMembers(limit);
      const members: MemberListItem[] = rows.map((r) => ({
        id: Number(r.use_id),
        username: r.username || null,
        firstName: r.fname,
        lastName: r.lname,
        sex: sexValue(r.sex) as SexValue | null,
        age: calcAge(r.dob),
        country: r.con_id
          ? { id: Number(r.con_id), code: r.con_code, name: r.con_name ?? '' }
          : null,
        profileImage: r.profile_img || null,
        online: Boolean(r.online),
      }));
      return { members };
    },

    /** Public discovery list — active, visible member profiles only. */
    async discoverMembers(filters: MemberDiscoveryFilters, page: number, limit: number) {
      const result = await profiles.findDiscoveryPage(filters, page, limit);
      const members: MemberDiscoveryCard[] = result.items.map((row) => ({
        id: Number(row.use_id),
        firstName: row.fname,
        lastName: row.lname,
        gender: sexValue(row.sex) as SexValue | null,
        age: calcAge(row.dob),
        location: {
          country: row.country_id
            ? {
                id: Number(row.country_id),
                code: row.country_code,
                name: row.country_name ?? '',
              }
            : null,
          state: row.state_id ? { id: Number(row.state_id), name: row.state_name ?? '' } : null,
          city: row.city || null,
        },
        languages: row.languages || null,
        profileImage: row.profile_img || null,
        coverImage: row.img || null,
        lookingToMeet: mapLookingToMeet(row.looking_to_meet).lookingToMeet,
        maritalStatus: maritalStatusValue(row.marital_status) as MemberDiscoveryCard['maritalStatus'],
        traits: mapTraits(row.other),
      }));

      return {
        members,
        page,
        limit,
        total: result.totalItems,
        totalPages: Math.ceil(result.totalItems / limit),
      };
    },
  };
}

export type ProfileService = ReturnType<typeof createProfileService>;

export const profileService = createProfileService({
  profiles: profileRepository,
  reference: referenceRepository,
  storage: localDiskStorage,
});
