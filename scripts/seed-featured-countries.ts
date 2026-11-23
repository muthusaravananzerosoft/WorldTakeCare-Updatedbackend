/**
 * Featured-countries import.
 *
 *   npx tsx scripts/seed-featured-countries.ts [--offset N] [--limit N] [--force]
 *
 * For each curated seed: verifies the country via REST Countries, searches
 * Unsplash for the landmark photo, validates the result against the
 * landmark/country tokens (never trusts the first hit blindly), pings the
 * download-tracking endpoint, and upserts into featured_countries keyed by
 * country_code — safe to re-run.
 *
 * Rows whose best photo can't be verified are saved with is_active=0 and no
 * image (manual review) instead of assigning an unrelated image.
 *
 * Requires UNSPLASH_ACCESS_KEY in .env. Unsplash demo apps: 50 req/hour —
 * the script throttles; use --offset/--limit to batch across runs.
 */
import '../src/config/env.config.js';
import { env } from '../src/config/env.config.js';
import { featuredCountryRepository } from '../src/repositories/featured-country.repository.js';
import { countryInfoProvider } from '../src/integrations/countries/index.js';
import { imageSearchProvider } from '../src/integrations/images/index.js';
import type { ImageSearchHit } from '../src/integrations/images/image-search.interface.js';
import { FEATURED_COUNTRY_SEEDS, type FeaturedCountrySeed } from './data/featured-countries.js';

const SEARCH_CANDIDATES = 5;
/** Seconds between Unsplash calls — keeps demo keys (50/hr) comfortable. */
const THROTTLE_MS = 2000;

const args = process.argv.slice(2);
const flag = (name: string, fallback: number) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : fallback;
};
const OFFSET = flag('offset', 0);
const LIMIT = flag('limit', FEATURED_COUNTRY_SEEDS.length);
const FORCE = args.includes('--force');

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Matches a photo's description against landmark + country tokens. */
export function scorePhoto(photo: ImageSearchHit, seed: FeaturedCountrySeed): number {
  const text = photo.description.toLowerCase();
  if (!text) return 0;
  let score = 0;
  for (const token of seed.landmark.toLowerCase().split(/\s+/)) {
    if (token.length > 2 && text.includes(token)) score += 2;
  }
  for (const token of seed.name.toLowerCase().split(/\s+/)) {
    if (token.length > 3 && text.includes(token)) score += 1;
  }
  return score;
}

const MIN_SCORE = 2; // at least one meaningful landmark/country token matched

async function seedOne(seed: FeaturedCountrySeed, order: number): Promise<string> {
  // Warn-only check: some legacy rows have blank codes (e.g. Zimbabwe) —
  // the curated seed name/code is trusted either way.
  const country = await countryInfoProvider.findByCode(seed.code);
  const nameNote = country ? '' : ` (code "${seed.code}" not in countries table)`;

  const existing = await featuredCountryRepository.findByCode(seed.code);
  if (existing?.imageUrl && !FORCE) return `SKIP ${seed.code} — already has image`;

  const hits = await imageSearchProvider.searchPhotos(seed.query, SEARCH_CANDIDATES);
  await sleep(THROTTLE_MS);

  const best = hits
    .map((h) => ({ h, score: scorePhoto(h, seed) }))
    .sort((a, b) => b.score - a.score)[0];

  const verified = best && best.score >= MIN_SCORE ? best.h : null;
  if (verified) await imageSearchProvider.trackDownload(verified);

  await featuredCountryRepository.upsertByCode({
    countryName: seed.name,
    countryCode: seed.code,
    description: seed.description,
    keywords: [...seed.keywords],
    landmarkName: seed.landmark,
    imageUrl: verified?.url,
    imageProvider: verified ? 'unsplash' : undefined,
    imageId: verified?.id,
    photographerName: verified?.photographerName,
    photographerUrl: verified?.photographerUrl,
    imageSourceUrl: verified?.sourceUrl,
    displayOrder: order,
    isActive: verified !== null,
  });

  return verified
    ? `OK   ${seed.code} ${seed.name} — ${seed.landmark} (${verified.id}, score ${best.score})${nameNote}`
    : `REVIEW ${seed.code} ${seed.name} — no verified photo (saved inactive)${nameNote}`;
}

async function main() {
  if (!env.UNSPLASH_ACCESS_KEY) {
    console.error('UNSPLASH_ACCESS_KEY is not set — add it to .env first.');
    process.exit(1);
  }
  const batch = FEATURED_COUNTRY_SEEDS.slice(OFFSET, OFFSET + LIMIT);
  console.log(`Seeding ${batch.length} countries (offset ${OFFSET}, force=${FORCE})...`);
  let ok = 0;
  let review = 0;
  let skip = 0;
  for (const [i, seed] of batch.entries()) {
    try {
      const line = await seedOne(seed, OFFSET + i + 1);
      if (line.startsWith('OK')) ok++;
      else if (line.startsWith('REVIEW')) review++;
      else skip++;
      console.log(line);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`FAIL ${seed.code} —`, msg);
      // Rate limit / auth rejection — stop hammering, resume next hour.
      if (msg.includes('403') || msg.includes('429')) {
        console.log('Rate limit reached — re-run this command in ~1 hour. Progress so far is saved.');
        break;
      }
    }
  }
  console.log(`Done: ${ok} imported, ${skip} skipped, ${review} need review.`);
  process.exit(0);
}

void main();
