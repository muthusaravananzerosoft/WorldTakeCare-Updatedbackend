import { afterEach, describe, expect, it, vi } from 'vitest';
import { GeoapifyProvider } from '../src/integrations/places/geoapify-provider.js';
import { NullPlacesProvider } from '../src/integrations/places/null-places-provider.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function stubFetch(body: unknown, status = 200) {
  const fetchMock = vi.fn(async (_url: unknown) => jsonResponse(body, status));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GeoapifyProvider.geocode', () => {
  it('maps the preferred destination feature and builds the geocode request', async () => {
    const fetchMock = stubFetch({
      features: [
        {
          properties: {
            place_id: 'abc123',
            result_type: 'street',
            name: 'Madurai Main Road',
            lat: 9.9,
            lon: 78.1,
          },
        },
        {
          properties: {
            place_id: 'def456',
            result_type: 'city',
            city: 'Madurai',
            state: 'Tamil Nadu',
            country: 'India',
            country_code: 'in',
            lat: 9.9252,
            lon: 78.1198,
          },
        },
      ],
    });
    const provider = new GeoapifyProvider('test-key');

    const hit = await provider.geocode('madurai');

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.origin + url.pathname).toBe('https://api.geoapify.com/v1/geocode/search');
    expect(url.searchParams.get('text')).toBe('madurai');
    expect(url.searchParams.get('apiKey')).toBe('test-key');
    expect(hit).toEqual({
      sourceId: 'def456',
      name: 'Madurai',
      admin1: 'Tamil Nadu',
      countryCode: 'IN',
      countryName: 'India',
      lat: 9.9252,
      lng: 78.1198,
      kind: 'city',
    });
  });

  it('returns null when the geocoder finds nothing', async () => {
    stubFetch({ features: [] });
    expect(await new GeoapifyProvider('k').geocode('zzz')).toBeNull();
  });

  it('returns null on HTTP failure instead of throwing', async () => {
    stubFetch({}, 500);
    expect(await new GeoapifyProvider('k').geocode('madurai')).toBeNull();
  });
});

describe('GeoapifyProvider.search', () => {
  it('maps autocomplete suggestions, filters to destination types and dedupes', async () => {
    const fetchMock = stubFetch({
      features: [
        {
          properties: {
            place_id: 'm1',
            result_type: 'city',
            city: 'Madurai',
            state: 'Tamil Nadu',
            country: 'India',
            country_code: 'in',
            lat: 9.92,
            lon: 78.11,
          },
        },
        // street result → filtered out
        { properties: { place_id: 's1', result_type: 'street', name: 'Madurai Rd', lat: 1, lon: 1 } },
        // nameless county → filtered out
        { properties: { place_id: 'c1', result_type: 'county', state: 'Tamil Nadu', lat: 2, lon: 2 } },
        // same name+admin1+cc as m1 → deduped
        {
          properties: {
            place_id: 'm2',
            result_type: 'city',
            city: 'madurai',
            state: 'Tamil Nadu',
            country: 'India',
            country_code: 'IN',
            lat: 9.93,
            lon: 78.12,
          },
        },
      ],
    });
    const provider = new GeoapifyProvider('test-key');

    const hits = await provider.search('madu', 5);

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.pathname).toBe('/v1/geocode/autocomplete');
    expect(url.searchParams.get('text')).toBe('madu');
    expect(url.searchParams.get('limit')).toBe('5');
    expect(hits).toEqual([
      {
        sourceId: 'm1',
        name: 'Madurai',
        admin1: 'Tamil Nadu',
        countryCode: 'IN',
        countryName: 'India',
        lat: 9.92,
        lng: 78.11,
        kind: 'city',
      },
    ]);
  });

  it('returns empty list on HTTP failure instead of throwing', async () => {
    stubFetch({}, 500);
    expect(await new GeoapifyProvider('k').search('madu', 5)).toEqual([]);
  });
});

describe('GeoapifyProvider.findAttractions', () => {
  it('issues one proximity-biased request per tourist tier', async () => {
    const fetchMock = stubFetch({ features: [] });
    await new GeoapifyProvider('k').findAttractions({
      lat: 9.92,
      lng: 78.12,
      radiusM: 25000,
      limit: 20,
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    for (const call of fetchMock.mock.calls) {
      const url = new URL(String(call[0]));
      expect(url.searchParams.get('filter')).toBe('circle:78.12,9.92,25000');
      expect(url.searchParams.get('bias')).toBe('proximity:78.12,9.92');
      expect(url.searchParams.get('lang')).toBe('en');
    }
  });

  it('boosts wikidata-linked places above same-category local spots', async () => {
    stubFetch({
      features: [
        {
          properties: {
            place_id: 'church-ordinary',
            name: 'Small Local Chapel',
            categories: ['religion.place_of_worship'],
            lat: 9.92,
            lon: 78.12,
          },
        },
        {
          properties: {
            place_id: 'church-famous',
            name: 'Notre-Dame',
            categories: ['religion.place_of_worship'],
            lat: 9.93,
            lon: 78.13,
            datasource: { raw: { wikidata: 'Q2981', wikipedia: 'en:Notre-Dame de Paris' } },
          },
        },
      ],
    });
    const list = await new GeoapifyProvider('k').findAttractions({
      lat: 9.92,
      lng: 78.12,
      radiusM: 25000,
      limit: 20,
    });
    const famous = list.find((a) => a.sourceId === 'church-famous')!;
    const ordinary = list.find((a) => a.sourceId === 'church-ordinary')!;
    expect(ordinary.touristRelevance).toBe(40);
    expect(famous.touristRelevance).toBe(69); // 40 base + 30 notability - 1 distance
    expect(list[0]?.sourceId).toBe('church-famous');
  });

  it('maps GeoJSON features, dedupes by place_id and prettifies categories', async () => {
    const fetchMock = stubFetch({
      features: [
        {
          properties: {
            place_id: 'w1',
            name: 'Meenakshi Amman Temple',
            categories: ['tourism', 'tourism.sights', 'tourism.sights.place_of_worship'],
            distance: 623.4,
            lat: 9.9195,
            lon: 78.1194,
            rank: { popularity: 1 },
          },
        },
        {
          properties: {
            place_id: 'w2',
            name: 'Thirumalai Nayakkar Palace',
            categories: ['tourism.sights.memorial'],
            distance: 1240,
            lat: 9.9145,
            lon: 78.1236,
          },
        },
        // duplicate place_id → dropped
        {
          properties: { place_id: 'w1', name: 'Meenakshi Amman Temple', lat: 9.91, lon: 78.11 },
        },
        // unnamed POI → dropped
        { properties: { place_id: 'w3', lat: 9.9, lon: 78.1 } },
      ],
    });
    const provider = new GeoapifyProvider('test-key');

    const list = await provider.findAttractions({
      lat: 9.9252,
      lng: 78.1198,
      radiusM: 15000,
      limit: 20,
    });

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.origin + url.pathname).toBe('https://api.geoapify.com/v2/places');
    expect(url.searchParams.get('filter')).toBe('circle:78.1198,9.9252,15000');
    expect(url.searchParams.get('categories')).toContain('tourism.sights');
    expect(url.searchParams.get('apiKey')).toBe('test-key');

    // Ordered by touristRelevance: temple (sights.place_of_worship, 82)
    // before memorial (78-1 distance) — not by distance.
    expect(list).toEqual([
      {
        sourceId: 'w1',
        name: 'Meenakshi Amman Temple',
        originalName: null,
        category: 'place of worship',
        lat: 9.9195,
        lng: 78.1194,
        rate: 7,
        touristRelevance: 82,
        distanceM: 623,
      },
      {
        sourceId: 'w2',
        name: 'Thirumalai Nayakkar Palace',
        originalName: null,
        category: 'memorial',
        lat: 9.9145,
        lng: 78.1236,
        rate: 0,
        touristRelevance: 77,
        distanceM: 1240,
      },
    ]);
  });

  it('prefers English international names and preserves the original', async () => {
    stubFetch({
      features: [
        {
          properties: {
            place_id: 't1',
            name: 'ஆயிரங்கால் மண்டபம்',
            name_international: { en: 'Thousand Pillar Mandapam' },
            categories: ['religion.place_of_worship.hinduism'],
            lat: 9.92,
            lon: 78.12,
          },
        },
      ],
    });
    const list = await new GeoapifyProvider('k').findAttractions({
      lat: 9.92,
      lng: 78.12,
      radiusM: 1000,
      limit: 10,
    });
    expect(list[0]).toMatchObject({
      name: 'Thousand Pillar Mandapam',
      originalName: 'ஆயிரங்கால் மண்டபம்',
      category: 'place of worship',
      touristRelevance: 40,
    });
  });

  it('falls back to geometry coordinates when properties lack lat/lon', async () => {
    stubFetch({
      features: [
        {
          properties: {
            place_id: 'g1',
            name: 'Gandhi Museum',
            categories: ['entertainment.museum'],
          },
          geometry: { coordinates: [78.134, 9.93] },
        },
      ],
    });
    const list = await new GeoapifyProvider('k').findAttractions({
      lat: 0,
      lng: 0,
      radiusM: 1000,
      limit: 10,
    });
    expect(list[0]).toMatchObject({ sourceId: 'g1', lat: 9.93, lng: 78.134, category: 'museum' });
  });

  it('returns empty list on HTTP failure instead of throwing', async () => {
    stubFetch({}, 429);
    expect(
      await new GeoapifyProvider('k').findAttractions({ lat: 0, lng: 0, radiusM: 1000, limit: 5 }),
    ).toEqual([]);
  });
});

describe('NullPlacesProvider', () => {
  it('returns empty results so the app works without an API key', async () => {
    const provider = new NullPlacesProvider();
    expect(await provider.geocode('madurai')).toBeNull();
    expect(await provider.search('madurai', 5)).toEqual([]);
    expect(
      await provider.findAttractions({ lat: 0, lng: 0, radiusM: 1000, limit: 5 }),
    ).toEqual([]);
  });
});
