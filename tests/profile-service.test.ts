import { describe, expect, it, vi } from 'vitest';
import type { CountryRef } from '../src/entities/profile.types.js';
import type { MediaStorage } from '../src/integrations/storage/media-storage.interface.js';
import type {
  ProfileRepository,
  ProfileUserRow,
  ProfileWrite,
} from '../src/repositories/profile.repository.js';
import type { ReferenceRepository } from '../src/repositories/reference.repository.js';
import { createProfileService } from '../src/services/profile.service.js';

// ---- fixtures --------------------------------------------------------------

const COUNTRIES: CountryRef[] = [
  { id: 231, code: 'US', name: 'United States' },
  { id: 102, code: 'IN', name: 'India' },
  { id: 37, code: 'CA', name: 'Canada' },
  { id: 14, code: 'AM', name: 'Armenia' },
];

function baseRow(overrides: Partial<ProfileUserRow> = {}): ProfileUserRow {
  return {
    fname: 'Muthu',
    lname: 'G',
    profile_img: null,
    img: null,
    sex: 1,
    dob: 631152000, // 1990-01-01 UTC
    marital_status: 1,
    languages: 'English, Tamil',
    other: '1,3',
    looking_to_meet: 'Woman',
    write_something: '<p>hi</p>',
    about: '<p>about</p>',
    fdob_con_id: 14,
    frac_id: 2,
    reli_id: 7,
    other_religion: 'Spiritual',
    fhei_id: 14,
    fedu_id: 5,
    fdob_nationality_id: '102,231',
    fadd1_con_id: 231,
    fadd1_sta_id: 4162,
    fadd1_cit_id: 'Beaverton',
    fadd1_zip_id: '97005',
    fadd1_tmz_id: 'PST',
    fadd2_con_id: 37,
    fadd2_sta_id: 436,
    fadd2_cit_id: 'Toronto',
    fadd2_zip_id: 'M5V',
    fadd2_tmz_id: 'EST',
    cob_code: 'AM',
    cob_name: 'Armenia',
    race_name: 'Asian',
    height_name: '5\' 9" (175 cm)',
    edu_name: 'Bachelor Degree',
    p_con_code: 'US',
    p_con_name: 'United States',
    p_sta_name: 'Oregon',
    s_con_code: 'CA',
    s_con_name: 'Canada',
    s_sta_name: 'Ontario',
    ...overrides,
  };
}

function fakeProfiles(row: ProfileUserRow | null = baseRow()) {
  const writes: ProfileWrite[] = [];
  const profiles: ProfileRepository = {
    findProfileRow: vi.fn(async () => row),
    findCountriesByIds: vi.fn(async (ids: number[]) =>
      ids.map((id) => COUNTRIES.find((c) => c.id === id)).filter((c): c is CountryRef => !!c),
    ),
    findVisited: vi.fn(async () => [
      { fcon_id: 231, fsta_id: 0, con_code: 'US', con_name: 'United States', sta_name: null },
      { fcon_id: 231, fsta_id: 4162, con_code: 'US', con_name: 'United States', sta_name: 'Oregon' },
      { fcon_id: 102, fsta_id: 0, con_code: 'IN', con_name: 'India', sta_name: null },
    ]),
    findVisiting: vi.fn(async () => ({
      fcon1_id: 102,
      fcon2_id: 37,
      c1_code: 'IN',
      c1_name: 'India',
      c2_code: 'CA',
      c2_name: 'Canada',
    })),
    saveProfile: vi.fn(async (_id: number, w: ProfileWrite) => void writes.push(w)),
    findNewestMembers: vi.fn(async () => [
      {
        use_id: 864,
        username: 'arun_k',
        fname: 'Arun',
        lname: 'Kumar',
        profile_img: 'https://api.test/uploads/member-photos/864/pic.png',
        sex: 1,
        dob: 631152000, // 1990-01-01 UTC
        con_id: 102,
        con_code: 'IN',
        con_name: 'India',
        online: 1,
      },
      {
        use_id: 860,
        username: null,
        fname: 'Meena',
        lname: 'S',
        profile_img: null,
        sex: 2,
        dob: null,
        con_id: null,
        con_code: null,
        con_name: null,
        online: 0,
      },
    ]),
    findPublicMemberRow: vi.fn(async () =>
      row ? { ...row, use_id: 875, username: 'muthu_g', online: 1 } : null,
    ),
    findDiscoveryPage: vi.fn(async () => ({
      items: [
        {
          use_id: 860,
          fname: 'Meena',
          lname: 'S',
          profile_img: 'https://api.test/uploads/member-photos/860/pic.png',
          img: 'https://api.test/uploads/member-covers/860/cover.png',
          sex: 2,
          dob: 631152000,
          marital_status: 1,
          languages: 'English, Tamil',
          other: '2,3',
          looking_to_meet: 'Woman',
          country_id: 231,
          country_code: 'US',
          country_name: 'United States',
          state_id: 4162,
          state_name: 'Oregon',
          city: 'Portland',
        },
      ],
      totalItems: 21,
    })),
  };
  return { profiles, writes };
}

function fakeStorage() {
  const deleted: string[] = [];
  const storage: MediaStorage = {
    put: vi.fn(async (key: string, data: Buffer, contentType: string) => ({
      key,
      url: `https://api.test/uploads/${key}`,
      contentType,
      sizeBytes: data.length,
    })),
    delete: vi.fn(async (key: string) => void deleted.push(key)),
    getUrl: vi.fn((key: string) => `https://api.test/uploads/${key}`),
  };
  return { storage, deleted };
}

function fakeReference() {
  const reference: ReferenceRepository = {
    listCountries: vi.fn(async () => COUNTRIES),
    listStatesByCountryId: vi.fn(async () => []),
    listRaces: vi.fn(async () => [{ id: 2, name: 'Asian' }]),
    listHeights: vi.fn(async () => [{ id: 14, name: '5\' 9" (175 cm)' }]),
    listEducations: vi.fn(async () => [{ id: 5, name: 'Bachelor Degree' }]),
    findCountriesByCodes: vi.fn(async (codes: string[]) =>
      COUNTRIES.filter((c) => c.code && codes.includes(c.code)),
    ),
    findCountriesByIds: vi.fn(async (ids: number[]) => COUNTRIES.filter((c) => ids.includes(c.id))),
    findStatesByIds: vi.fn(async (ids: number[]) =>
      [
        { id: 4162, name: 'Oregon', countryId: 231 },
        { id: 436, name: 'Ontario', countryId: 37 },
      ].filter((s) => ids.includes(s.id)),
    ),
    raceExists: vi.fn(async (id: number) => id === 2),
    heightExists: vi.fn(async (id: number) => id === 14),
    educationExists: vi.fn(async (id: number) => id === 5),
  };
  return reference;
}

// ---- tests ------------------------------------------------------------------

describe('profile service', () => {
  it('returns the assembled profile with resolved names, age and selections', async () => {
    const { profiles } = fakeProfiles();
    const svc = createProfileService({ profiles, reference: fakeReference(), storage: fakeStorage().storage });

    const { profile } = await svc.getProfile(861);

    expect(profile.personal.firstName).toBe('Muthu');
    expect(profile.personal.sex).toBe('male');
    expect(profile.personal.dob).toBe('1990-01-01');
    expect(profile.personal.age).toBeGreaterThanOrEqual(35);
    expect(profile.personal.countryOfBirth).toEqual({ id: 14, code: 'AM', name: 'Armenia' });
    expect(profile.personal.race).toEqual({ id: 2, name: 'Asian' });
    expect(profile.personal.religion).toEqual({ id: 7, name: 'Other' });
    expect(profile.personal.otherReligion).toBe('Spiritual');
    expect(profile.personal.maritalStatus).toBe('available');
    expect(profile.personal.traits).toEqual(['non_smoker', 'tourist_guide']);
    expect(profile.personal.lookingToMeet).toBe('woman');
    expect(profile.personal.nationalities.map((c) => c.code)).toEqual(['IN', 'US']);

    expect(profile.location.primary.country?.name).toBe('United States');
    expect(profile.location.primary.state).toEqual({ id: 4162, name: 'Oregon' });
    expect(profile.location.primary.city).toBe('Beaverton');
    expect(profile.location.secondary.country?.name).toBe('Canada');

    expect(profile.visitedCountries).toHaveLength(2);
    expect(profile.visitedCountries[0]!.country.name).toBe('United States');
    expect(profile.visitedCountries[0]!.states).toEqual([{ id: 4162, name: 'Oregon' }]);
    expect(profile.visitedCountries[1]!.country.name).toBe('India');
    expect(profile.visitedCountries[1]!.states).toEqual([]);

    expect(profile.visitingCountries.map((c) => c.code)).toEqual(['IN', 'CA']);
    expect(profile.profileImage).toBeNull();
  });

  it('404s when the user does not exist', async () => {
    const { profiles } = fakeProfiles(null);
    const svc = createProfileService({ profiles, reference: fakeReference(), storage: fakeStorage().storage });
    await expect(svc.getProfile(999)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('maps the PUT body to legacy columns inside one saveProfile call', async () => {
    const { profiles, writes } = fakeProfiles();
    const svc = createProfileService({ profiles, reference: fakeReference(), storage: fakeStorage().storage });

    await svc.updateProfile(861, {
      personal: {
        firstName: 'New',
        lastName: 'Name',
        sex: 'female',
        dob: '1996-01-17',
        countryOfBirth: 'US',
        raceId: 2,
        religionId: 2,
        heightId: 14,
        maritalStatus: 'married',
        educationId: 5,
        languages: 'English',
        traits: ['vegetarian'],
        nationalities: ['IN', 'CA'],
        lookingToMeet: 'man',
        writeSomething: '<p>x</p>',
        about: null,
      },
      location: {
        primary: { countryCode: 'US', stateId: 4162, city: 'Salem', zip: '97301', timezone: 'PST' },
        secondary: { countryCode: 'CA', stateId: null },
      },
      visitedCountries: [
        { countryCode: 'US', stateIds: [4162] },
        { countryCode: 'IN', stateIds: [] },
      ],
      visitingCountries: ['IN', 'CA'],
    });

    expect(writes).toHaveLength(1);
    const w = writes[0]!;
    const c = w.columns;
    expect(c.fname).toBe('New');
    expect(c.sex).toBe(2);
    expect(c.dob).toBe(Math.floor(new Date('1996-01-17T00:00:00Z').getTime() / 1000));
    expect(c.fdob_con_id).toBe(231);
    expect(c.frac_id).toBe(2);
    expect(c.reli_id).toBe(2);
    // religion switched away from Other → other_religion cleared
    expect(c.other_religion).toBeNull();
    expect(c.fhei_id).toBe(14);
    expect(c.marital_status).toBe(5);
    expect(c.fedu_id).toBe(5);
    expect(c['`other`']).toBe('2');
    expect(c.fdob_nationality_id).toBe('102,37');
    expect(c.looking_to_meet).toBe('Man');
    expect(c.about).toBeNull();
    expect(c.fadd1_con_id).toBe(231);
    expect(c.fadd1_sta_id).toBe(4162);
    expect(c.fadd1_cit_id).toBe('Salem');
    expect(c.fadd2_con_id).toBe(37);
    expect(c.fadd2_sta_id).toBeNull();

    expect(w.visited).toEqual([
      { countryId: 231, stateIds: [4162] },
      { countryId: 102, stateIds: [] },
    ]);
    expect(w.visiting).toEqual([102, 37]);
  });

  it('stores free text for lookingToMeet=other and leaves absent sections untouched', async () => {
    const { profiles, writes } = fakeProfiles();
    const svc = createProfileService({ profiles, reference: fakeReference(), storage: fakeStorage().storage });

    await svc.updateProfile(861, {
      personal: {
        firstName: 'Muthu',
        lastName: 'G',
        religionId: 7,
        otherReligion: 'Shik',
        lookingToMeet: 'other',
        lookingToMeetOther: 'Penpals',
        nationalities: [],
      },
      visitingCountries: [],
    });

    const w = writes[0]!;
    expect(w.columns.looking_to_meet).toBe('Penpals');
    expect(w.columns.other_religion).toBe('Shik');
    expect(w.columns.fdob_nationality_id).toBeNull();
    expect(w.visited).toBeUndefined();
    expect(w.visiting).toEqual([]); // cleared
  });

  it('rejects an unknown country code', async () => {
    const { profiles } = fakeProfiles();
    const svc = createProfileService({ profiles, reference: fakeReference(), storage: fakeStorage().storage });
    await expect(
      svc.updateProfile(861, {
        personal: { firstName: 'A', lastName: 'B', countryOfBirth: 'ZZ' },
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects a state that does not belong to the visited country', async () => {
    const { profiles } = fakeProfiles();
    const svc = createProfileService({ profiles, reference: fakeReference(), storage: fakeStorage().storage });
    await expect(
      svc.updateProfile(861, {
        personal: { firstName: 'A', lastName: 'B' },
        visitedCountries: [{ countryCode: 'IN', stateIds: [4162] }], // 4162 is Oregon (US)
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects duplicate countries and unknown race/height/education ids', async () => {
    const { profiles } = fakeProfiles();
    const svc = createProfileService({ profiles, reference: fakeReference(), storage: fakeStorage().storage });

    await expect(
      svc.updateProfile(861, {
        personal: { firstName: 'A', lastName: 'B' },
        visitedCountries: [
          { countryCode: 'US', stateIds: [] },
          { countryCode: 'US', stateIds: [] },
        ],
      }),
    ).rejects.toMatchObject({ statusCode: 400 });

    await expect(
      svc.updateProfile(861, { personal: { firstName: 'A', lastName: 'B', raceId: 99 } }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('stores a profile photo and cover image inside the profile save', async () => {
    const oldPhoto = 'https://api.test/uploads/member-photos/861/old.jpg';
    const oldCover = 'https://api.test/uploads/member-covers/861/old.jpg';
    const { profiles, writes } = fakeProfiles(
      baseRow({ profile_img: oldPhoto, img: oldCover }),
    );
    const { storage, deleted } = fakeStorage();
    const svc = createProfileService({ profiles, reference: fakeReference(), storage });

    const png = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(64),
    ]);
    const file = { mimetype: 'image/png', buffer: png, size: png.length } as Express.Multer.File;

    await svc.updateProfile(861, {}, { profileImage: file, coverImage: file });

    const w = writes[0]!;
    expect(w.columns.profile_img).toMatch(
      /^https:\/\/api\.test\/uploads\/member-photos\/861\/.+\.png$/,
    );
    expect(w.columns.img).toMatch(/^https:\/\/api\.test\/uploads\/member-covers\/861\/.+\.png$/);
    // Old files are deleted only after the save succeeded.
    expect(deleted).toEqual(['member-photos/861/old.jpg', 'member-covers/861/old.jpg']);
  });

  it('clears images via remove flags and leaves them untouched otherwise', async () => {
    const { profiles, writes } = fakeProfiles(
      baseRow({
        profile_img: 'https://api.test/uploads/member-photos/861/pic.jpg',
        img: 'https://api.test/uploads/member-covers/861/pic.jpg',
      }),
    );
    const { storage, deleted } = fakeStorage();
    const svc = createProfileService({ profiles, reference: fakeReference(), storage });

    await svc.updateProfile(861, { removeProfileImage: true, removeCoverImage: true });

    expect(writes[0]!.columns.profile_img).toBeNull();
    expect(writes[0]!.columns.img).toBeNull();
    expect(deleted).toEqual(['member-photos/861/pic.jpg', 'member-covers/861/pic.jpg']);

    // No files and no flags → image columns are not part of the UPDATE.
    await svc.updateProfile(861, { personal: { firstName: 'A', lastName: 'B' } });
    expect(writes[1]!.columns.profile_img).toBeUndefined();
    expect(writes[1]!.columns.img).toBeUndefined();
  });

  it('rejects a fake image signature inside the merged save', async () => {
    const { profiles } = fakeProfiles();
    const svc = createProfileService({
      profiles,
      reference: fakeReference(),
      storage: fakeStorage().storage,
    });

    const fake = {
      mimetype: 'image/png',
      buffer: Buffer.from('not an image at all'),
      size: 20,
    } as Express.Multer.File;
    await expect(
      svc.updateProfile(861, {}, { coverImage: fake }),
    ).rejects.toMatchObject({ statusCode: 415 });
  });

  it('lists newest members as homepage cards with resolved country, age and online flag', async () => {
    const { profiles } = fakeProfiles();
    const svc = createProfileService({
      profiles,
      reference: fakeReference(),
      storage: fakeStorage().storage,
    });

    const { members } = await svc.newestMembers(15);

    expect(profiles.findNewestMembers).toHaveBeenCalledWith(15);
    expect(members).toHaveLength(2);
    expect(members[0]).toEqual({
      id: 864,
      username: 'arun_k',
      firstName: 'Arun',
      lastName: 'Kumar',
      sex: 'male',
      age: expect.any(Number),
      country: { id: 102, code: 'IN', name: 'India' },
      profileImage: 'https://api.test/uploads/member-photos/864/pic.png',
      online: true,
    });
    // sparse member: no country/dob/photo/username → nulls, not crashes
    expect(members[1]).toMatchObject({
      id: 860,
      username: null,
      sex: 'female',
      age: null,
      country: null,
      profileImage: null,
      online: false,
    });
  });

  it('lists discovery cards and preserves filters and page metadata', async () => {
    const { profiles } = fakeProfiles();
    const svc = createProfileService({
      profiles,
      reference: fakeReference(),
      storage: fakeStorage().storage,
    });
    const filters = {
      q: 'Meena',
      gender: 'female' as const,
      countryCode: 'US',
      language: 'English',
      lookingToMeet: 'woman' as const,
      sort: 'recommended' as const,
    };

    const result = await svc.discoverMembers(filters, 2, 10);

    expect(profiles.findDiscoveryPage).toHaveBeenCalledWith(filters, 2, 10);
    expect(result).toMatchObject({
      page: 2,
      limit: 10,
      total: 21,
      totalPages: 3,
      members: [
        {
          id: 860,
          firstName: 'Meena',
          lastName: 'S',
          gender: 'female',
          age: expect.any(Number),
          location: {
            country: { id: 231, code: 'US', name: 'United States' },
            state: { id: 4162, name: 'Oregon' },
            city: 'Portland',
          },
          languages: 'English, Tamil',
          profileImage: 'https://api.test/uploads/member-photos/860/pic.png',
          coverImage: 'https://api.test/uploads/member-covers/860/cover.png',
          lookingToMeet: 'woman',
          maritalStatus: 'available',
          traits: ['vegetarian', 'tourist_guide'],
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain('dob');
  });

  it('returns the public member profile without dob, zip or timezone', async () => {
    const { profiles } = fakeProfiles();
    const svc = createProfileService({
      profiles,
      reference: fakeReference(),
      storage: fakeStorage().storage,
    });

    const { member } = await svc.getPublicMember(875);

    expect(profiles.findPublicMemberRow).toHaveBeenCalledWith(875);
    expect(member).toMatchObject({
      id: 875,
      username: 'muthu_g',
      online: true,
      firstName: 'Muthu',
      lastName: 'G',
      sex: 'male',
      age: expect.any(Number),
      maritalStatus: 'available',
      countryOfBirth: { id: 14, code: 'AM', name: 'Armenia' },
      location: {
        primary: {
          country: { id: 231, code: 'US', name: 'United States' },
          state: { id: 4162, name: 'Oregon' },
          city: 'Beaverton',
        },
        secondary: {
          country: { id: 37, code: 'CA', name: 'Canada' },
          state: { id: 436, name: 'Ontario' },
          city: 'Toronto',
        },
      },
    });
    // private fields are omitted entirely
    expect('dob' in member).toBe(false);
    const serialized = JSON.stringify(member);
    expect(serialized).not.toContain('97005');
    expect(serialized).not.toContain('PST');
  });

  it('returns 404 when the member is missing or not publicly visible', async () => {
    const { profiles } = fakeProfiles(null);
    const svc = createProfileService({
      profiles,
      reference: fakeReference(),
      storage: fakeStorage().storage,
    });

    await expect(svc.getPublicMember(999)).rejects.toMatchObject({ statusCode: 404 });
  });
});
