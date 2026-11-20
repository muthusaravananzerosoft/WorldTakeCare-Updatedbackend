import { env } from '../../config/env.config.js';
import type { ImageSearchProvider } from './image-search.interface.js';
import { NullImageProvider } from './null-image-provider.js';
import { UnsplashProvider } from './unsplash-provider.js';

/**
 * Image provider selection — without UNSPLASH_ACCESS_KEY the app still
 * runs; only the seed import needs the key.
 */
export const imageSearchProvider: ImageSearchProvider = env.UNSPLASH_ACCESS_KEY
  ? new UnsplashProvider(env.UNSPLASH_ACCESS_KEY)
  : new NullImageProvider();
