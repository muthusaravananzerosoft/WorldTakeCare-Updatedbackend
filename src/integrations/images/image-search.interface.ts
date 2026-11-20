/** Result from an image-search provider (Unsplash). */
export interface ImageSearchHit {
  /** Provider photo id. */
  id: string;
  /** Hotlinkable image URL (Unsplash CDN — use as-is per their guidelines). */
  url: string;
  /** Photographer display name — required attribution. */
  photographerName: string;
  /** Photographer profile page — required attribution. */
  photographerUrl: string;
  /** Photo page on the provider site. */
  sourceUrl: string;
  /** Provider endpoint that must be pinged for download tracking. */
  downloadTrackUrl: string;
  /** Free-text hints used to verify the image matches the landmark. */
  description: string;
}

export interface ImageSearchProvider {
  /**
   * Searches for landscape photos matching the query. Returns candidates
   * ordered by the provider's relevance — callers still apply their own
   * matching heuristics before trusting a result.
   */
  searchPhotos(query: string, limit: number): Promise<ImageSearchHit[]>;
  /** Pings the provider's download-tracking endpoint (fire-and-forget). */
  trackDownload(hit: ImageSearchHit): Promise<void>;
}
