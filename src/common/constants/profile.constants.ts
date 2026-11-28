/**
 * Profile option lists shared by the profile API, its validators and the
 * reference-options endpoint. The numeric ids are the legacy encodings
 * stored in `user` columns; religion, marital status, traits, sex and
 * looking-to-meet have no lookup table in the legacy schema (the PHP
 * hardcoded them), so they live here as constants.
 */

export const SEX_OPTIONS = [
  { id: 1, value: 'male', label: 'Male' },
  { id: 2, value: 'female', label: 'Female' },
] as const;

export const MARITAL_STATUS_OPTIONS = [
  { id: 1, value: 'available', label: 'Available' },
  { id: 2, value: 'seeing_someone', label: 'Currently Seeing Someone' },
  { id: 3, value: 'complicated', label: "It's Complicated" },
  { id: 4, value: 'single', label: 'Single' },
  { id: 5, value: 'married', label: 'Married' },
  { id: 6, value: 'separated', label: 'Separated' },
  { id: 7, value: 'divorced', label: 'Divorced' },
  { id: 8, value: 'widowed', label: 'Widowed' },
  /** Hides the member from search results in the legacy app. */
  { id: 9, value: 'offline', label: 'Offline' },
] as const;

export const RELIGION_OPTIONS = [
  { id: 1, name: 'Buddhism' },
  { id: 2, name: 'Christianity' },
  { id: 3, name: 'Hinduism' },
  { id: 4, name: 'Islam' },
  { id: 5, name: 'Judaism' },
  { id: 6, name: 'No Religion' },
  { id: 7, name: 'Other' },
] as const;

export const RELIGION_OTHER_ID = 7;

/**
 * Lifestyle presets — stored as a CSV of ids in `user.other`. These are the
 * canonical presets only; the column also carries free-text custom traits
 * (any non-numeric token) so members aren't limited to this list.
 */
export const TRAIT_OPTIONS = [
  { id: 1, value: 'non_smoker', label: 'Non-Smoker' },
  { id: 2, value: 'vegetarian', label: 'Vegetarian' },
  { id: 3, value: 'tourist_guide', label: 'Tourist Guide' },
] as const;

/** `user.other` is varchar(222) — the joined CSV must fit with headroom. */
export const MAX_TRAIT_CSV_LENGTH = 220;
export const MAX_TRAITS = 10;
/** Length of one custom trait label. */
export const MAX_TRAIT_LENGTH = 60;

/** `stored` is the literal written to `user.looking_to_meet` (legacy strings). */
export const LOOKING_TO_MEET_OPTIONS = [
  { value: 'man', label: 'Man', stored: 'Man' },
  { value: 'woman', label: 'Woman', stored: 'Woman' },
  { value: 'man_or_woman', label: 'Man or Woman', stored: 'Man or Woman' },
  { value: 'other', label: 'Others' },
] as const;

export const MAX_NATIONALITIES = 5;
export const MAX_VISITING_COUNTRIES = 2;

export function maritalStatusId(value: string): number | undefined {
  return MARITAL_STATUS_OPTIONS.find((o) => o.value === value)?.id;
}

export function maritalStatusValue(id: number | null): string | null {
  return MARITAL_STATUS_OPTIONS.find((o) => o.id === id)?.value ?? null;
}

export function traitId(value: string): number | undefined {
  return TRAIT_OPTIONS.find((o) => o.value === value)?.id;
}

export function traitValue(id: number): string | null {
  return TRAIT_OPTIONS.find((o) => o.id === id)?.value ?? null;
}

export function sexId(value: string): number | undefined {
  return SEX_OPTIONS.find((o) => o.value === value)?.id;
}

export function sexValue(id: number | null): string | null {
  return SEX_OPTIONS.find((o) => o.id === id)?.value ?? null;
}

export function religionOption(id: number | null): { id: number; name: string } | null {
  const found = RELIGION_OPTIONS.find((o) => o.id === id);
  return found ? { id: found.id, name: found.name } : null;
}
