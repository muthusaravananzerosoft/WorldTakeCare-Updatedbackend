/** Featured ("top tourist") countries domain types. */

export interface FeaturedCountryRecord {
  id: number;
  countryName: string;
  /** ISO-3166 alpha-2, upper-case. */
  countryCode: string;
  /** One-line travel description. */
  description: string;
  /** Exactly 3 travel keywords. */
  keywords: string[];
  /** Famous attraction shown in the image (e.g. 'Eiffel Tower'). */
  landmarkName: string;
  imageUrl: string | null;
  imageProvider: string | null;
  /** Provider photo id (Unsplash photo id). */
  imageId: string | null;
  photographerName: string | null;
  /** Photographer profile URL — required Unsplash attribution. */
  photographerUrl: string | null;
  /** Unsplash photo page URL — required attribution. */
  imageSourceUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Admin create/update payload (validated). Image fields stay nullable so a
 *  country can be saved pending manual image review. */
export interface FeaturedCountryInput {
  countryName: string;
  countryCode: string;
  description: string;
  keywords: string[];
  landmarkName: string;
  imageUrl?: string;
  imageProvider?: string;
  imageId?: string;
  photographerName?: string;
  photographerUrl?: string;
  imageSourceUrl?: string;
  displayOrder: number;
  isActive: boolean;
}

export type FeaturedCountryUpdateInput = Partial<FeaturedCountryInput>;

/** Public response — the four card details plus attribution. */
export interface FeaturedCountryResult {
  id: number;
  countryName: string;
  countryCode: string;
  description: string;
  keywords: string[];
  landmarkName: string;
  image: {
    url: string | null;
    provider: string | null;
    id: string | null;
    sourceUrl: string | null;
  };
  attribution: {
    photographerName: string | null;
    photographerUrl: string | null;
  };
}
