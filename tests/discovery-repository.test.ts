import { afterEach, describe, expect, it, vi } from 'vitest';
import { databaseClient } from '../src/database/client.js';
import type { MemberDiscoveryFilters } from '../src/entities/profile.types.js';
import { profileRepository } from '../src/repositories/profile.repository.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('member discovery repository', () => {
  it('combines member-only, visibility, search, location and profile filters', async () => {
    const query = vi
      .spyOn(databaseClient, 'query')
      .mockResolvedValueOnce([{ total: 1 }] as never)
      .mockResolvedValueOnce([] as never);
    const filters: MemberDiscoveryFilters = {
      q: 'Muthu',
      ageMin: 25,
      ageMax: 40,
      gender: 'female',
      countryCode: 'US',
      stateId: 4162,
      city: 'Portland',
      language: 'English',
      lookingToMeet: 'woman',
      maritalStatus: 'single',
      raceId: 2,
      religionId: 3,
      trait: 'vegetarian',
      sort: 'recommended',
    };

    const result = await profileRepository.findDiscoveryPage(filters, 2, 10);
    const [countSql, countParams] = query.mock.calls[0]!;
    const [pageSql, pageParams] = query.mock.calls[1]!;

    expect(result).toEqual({ items: [], totalItems: 1 });
    expect(countSql).toContain('u.active = 1');
    expect(countSql).toContain('u.isdel = 0');
    expect(countSql).toContain('u.suspend = 0');
    expect(countSql).toContain('u.marital_status <> 9');
    expect(countSql).toContain("TRIM(u.fname) <> ''");
    expect(countSql).toContain("TRIM(u.lname) <> ''");
    expect(countSql).toContain("u.role IN ('member', 'user')");
    expect(countSql).toContain('COALESCE(u.roles, 3) <> 1');
    expect(countSql).toContain("LOWER(CONCAT(u.fname, ' ', u.lname))");
    expect(countSql).toContain('(c1.code = ? AND u.fadd1_sta_id = ?');
    expect(countSql).toContain('(c2.code = ? AND u.fadd2_sta_id = ?');
    expect(countSql).toContain('FIND_IN_SET(LOWER(?), LOWER(REPLACE(u.languages');
    expect(countSql).toContain('u.looking_to_meet');
    expect(countSql).toContain('u.marital_status = ?');
    expect(countSql).toContain('u.frac_id = ?');
    expect(countSql).toContain('u.reli_id = ?');
    expect(countSql).toContain('FIND_IN_SET(?, u.`other`)');
    expect(countParams).toEqual(
      expect.arrayContaining(['%Muthu%', 'US', 4162, '%Portland%', 'English', 'woman', 4, 2, 3, '2']),
    );
    expect(pageSql).toContain('ORDER BY (');
    expect(pageSql).toContain('u.use_id DESC');
    expect(pageSql).toContain('LIMIT ? OFFSET ?');
    expect(pageParams?.slice(-2)).toEqual([10, 10]);
  });

  it('matches a custom trait as a literal CSV token', async () => {
    const query = vi
      .spyOn(databaseClient, 'query')
      .mockResolvedValueOnce([{ total: 0 }] as never)
      .mockResolvedValueOnce([] as never);

    await profileRepository.findDiscoveryPage({ trait: 'Rock Climbing', sort: 'newest' }, 1, 15);

    const [sql, params] = query.mock.calls[0]!;
    expect(sql).toContain('FIND_IN_SET(?, u.`other`)');
    expect(params).toContain('Rock Climbing');
  });

  it('keeps each sort deterministic with the member id as its final tie-breaker', async () => {
    const query = vi.spyOn(databaseClient, 'query').mockResolvedValue([] as never);
    const sorts: MemberDiscoveryFilters['sort'][] = [
      'recommended',
      'newest',
      'age_asc',
      'age_desc',
    ];

    for (const sort of sorts) {
      await profileRepository.findDiscoveryPage({ sort }, 1, 15);
    }

    const listSql = query.mock.calls.filter(([, params]) => params?.length === 2);
    expect(listSql).toHaveLength(sorts.length);
    expect(listSql[0]?.[0]).toContain('u.use_id DESC');
    expect(listSql[1]?.[0]).toContain('CAST(NULLIF(u.registered');
    expect(listSql[2]?.[0]).toContain('u.dob DESC, u.use_id ASC');
    expect(listSql[3]?.[0]).toContain('u.dob ASC, u.use_id ASC');
  });
});
