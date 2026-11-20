import type { ImageSearchHit, ImageSearchProvider } from './image-search.interface.js';

/** No-op image provider used when UNSPLASH_ACCESS_KEY is not configured. */
export class NullImageProvider implements ImageSearchProvider {
  async searchPhotos(_query: string, _limit: number): Promise<ImageSearchHit[]> {
    return [];
  }

  async trackDownload(_hit: ImageSearchHit): Promise<void> {}
}
