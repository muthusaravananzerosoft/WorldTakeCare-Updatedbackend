import type { ImageSearchHit, ImageSearchProvider } from './image-search.interface.js';

const SEARCH_URL = 'https://api.unsplash.com/search/photos';
const REQUEST_TIMEOUT_MS = 8000;

interface UnsplashPhoto {
  id: string;
  description: string | null;
  alt_description: string | null;
  urls: { regular: string };
  user: { name: string; links: { html: string } };
  links: { html: string; download_location: string };
}

/**
 * Unsplash Search API adapter.
 * Guidelines we follow (https://help.unsplash.com/en/articles/2511245):
 * - images are HOTLINKED from images.unsplash.com (never re-hosted);
 * - `links.download_location` is pinged once per selected photo;
 * - photographer name + profile URL and the Unsplash photo page are stored
 *   for attribution next to every displayed image;
 * - API key goes in the Authorization header, never in a URL or the client.
 *
 * Demo apps: 50 requests/hour — the seed script throttles accordingly.
 */
export class UnsplashProvider implements ImageSearchProvider {
  constructor(private readonly accessKey: string) {}

  async searchPhotos(query: string, limit: number): Promise<ImageSearchHit[]> {
    const qs = new URLSearchParams({
      query,
      per_page: String(limit),
      orientation: 'landscape',
      content_filter: 'high',
    });
    const res = await fetch(`${SEARCH_URL}?${qs.toString()}`, {
      headers: { Authorization: `Client-ID ${this.accessKey}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Unsplash search failed: ${res.status}`);
    const data = (await res.json()) as { results: UnsplashPhoto[] };
    return data.results.map((p) => ({
      id: p.id,
      url: p.urls.regular,
      photographerName: p.user.name,
      photographerUrl: `${p.user.links.html}?utm_source=worldtaker&utm_medium=referral`,
      sourceUrl: `${p.links.html}?utm_source=worldtaker&utm_medium=referral`,
      downloadTrackUrl: p.links.download_location,
      description: [p.description, p.alt_description].filter(Boolean).join(' '),
    }));
  }

  async trackDownload(hit: ImageSearchHit): Promise<void> {
    try {
      await fetch(hit.downloadTrackUrl, {
        headers: { Authorization: `Client-ID ${this.accessKey}` },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      // Download tracking is best-effort — never fail a seed run over it.
    }
  }
}
