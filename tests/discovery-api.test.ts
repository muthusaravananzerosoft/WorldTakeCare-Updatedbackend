import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { databaseClient } from '../src/database/client.js';

const app = createApp();

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/v1/discovery/members validation', () => {
  it('returns a public member page for combined search filters', async () => {
    const query = vi
      .spyOn(databaseClient, 'query')
      .mockResolvedValueOnce([{ total: 2 }] as never)
      .mockResolvedValueOnce([
        {
          use_id: 860,
          fname: 'Meena',
          lname: 'S',
          profile_img: null,
          img: null,
          sex: 2,
          dob: 631152000,
          marital_status: 1,
          languages: 'English, Tamil',
          other: '2',
          looking_to_meet: 'Woman',
          country_id: 231,
          country_code: 'US',
          country_name: 'United States',
          state_id: 4162,
          state_name: 'Oregon',
          city: 'Portland',
        },
      ] as never);

    const res = await request(app).get(
      '/api/v1/discovery/members?q=Meena&gender=female&countryCode=us&language=English&page=2&limit=1',
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      page: 2,
      limit: 1,
      total: 2,
      totalPages: 2,
      members: [
        {
          id: 860,
          firstName: 'Meena',
          lastName: 'S',
          gender: 'female',
          location: {
            country: { id: 231, code: 'US', name: 'United States' },
            state: { id: 4162, name: 'Oregon' },
            city: 'Portland',
          },
          languages: 'English, Tamil',
          lookingToMeet: 'woman',
        },
      ],
    });
    expect(res.body.data.members[0]).not.toHaveProperty('dob');
    expect(res.body.data.members[0]).not.toHaveProperty('email');
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0]?.[0]).toContain("u.role IN ('member', 'user')");
    expect(query.mock.calls[1]?.[0]).toContain('u.languages IS NOT NULL');
    expect(query.mock.calls[0]?.[1]).toContain('US');
    expect(query.mock.calls[1]?.[1]?.slice(-2)).toEqual([1, 1]);
  });

  it('rejects age ranges where the minimum exceeds the maximum', async () => {
    const res = await request(app).get('/api/v1/discovery/members?ageMin=50&ageMax=30');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects unsupported sort and pagination values', async () => {
    const res = await request(app).get('/api/v1/discovery/members?sort=random&page=0&limit=51');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toHaveLength(3);
  });

  it('keeps the existing homepage recent-members route registered', async () => {
    const res = await request(app).get('/api/v1/users/newest?limit=0');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
