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
    setProfileImage: vi.fn(async () => undefined),
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

  it('uploads a profile photo, stores the URL and removes the old file', async () => {
    const oldUrl = 'https://api.test/uploads/member-photos/861/old.jpg';
    const { profiles } = fakeProfiles(baseRow({ profile_img: oldUrl }));
    const { storage, deleted } = fakeStorage();
    const svc = createProfileService({ profiles, reference: fakeReference(), storage });

    const png = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(64),
    ]);
    const file = { mimetype: 'image/png', buffer: png, size: png.length } as Express.Multer.File;

    const result = await svc.uploadPhoto(861, file);

    expect(result.profileImage).toMatch(
      /^https:\/\/api\.test\/uploads\/member-photos\/861\/.+\.png$/,
    );
    expect(profiles.setProfileImage).toHaveBeenCalledWith(861, result.profileImage);
    expect(deleted).toEqual(['member-photos/861/old.jpg']);
  });

  it('deletes the profile photo and clears the column', async () => {
    const url = 'https://api.test/uploads/member-photos/861/pic.jpg';
    const { profiles } = fakeProfiles(baseRow({ profile_img: url }));
    const { storage, deleted } = fakeStorage();
    const svc = createProfileService({ profiles, reference: fakeReference(), storage });

    const result = await svc.deletePhoto(861);

    expect(result.profileImage).toBeNull();
    expect(profiles.setProfileImage).toHaveBeenCalledWith(861, null);
    expect(deleted).toEqual(['member-photos/861/pic.jpg']);
  });

  it('rejects photo upload without a file or with a fake signature', async () => {
    const { profiles } = fakeProfiles();
    const svc = createProfileService({
      profiles,
      reference: fakeReference(),
      storage: fakeStorage().storage,
    });

    await expect(svc.uploadPhoto(861, undefined)).rejects.toMatchObject({ statusCode: 400 });

    const fake = {
      mimetype: 'image/png',
      buffer: Buffer.from('not an image at all'),
      size: 20,
    } as Express.Multer.File;
    await expect(svc.uploadPhoto(861, fake)).rejects.toMatchObject({ statusCode: 415 });
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
});
