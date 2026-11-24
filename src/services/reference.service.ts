import {
  LOOKING_TO_MEET_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  RELIGION_OPTIONS,
  SEX_OPTIONS,
  TRAIT_OPTIONS,
} from '../common/constants/profile.constants.js';
import type { ReferenceOptions } from '../entities/profile.types.js';
import type { ReferenceRepository } from '../repositories/reference.repository.js';
import { referenceRepository } from '../repositories/reference.repository.js';
import { AppError } from '../common/errors/app-error.js';

export interface ReferenceServiceDeps {
  reference: ReferenceRepository;
}

export function createReferenceService(deps: ReferenceServiceDeps) {
  const { reference } = deps;

  return {
    /** All dropdown options needed by the profile/account forms. */
    async options(): Promise<{ options: ReferenceOptions }> {
      const [countries, races, heights, educations] = await Promise.all([
        reference.listCountries(),
        reference.listRaces(),
        reference.listHeights(),
        reference.listEducations(),
      ]);
      return {
        options: {
          countries,
          races,
          heights,
          educations,
          religions: RELIGION_OPTIONS.map((o) => ({ id: o.id, name: o.name })),
          maritalStatuses: MARITAL_STATUS_OPTIONS.map((o) => ({
            id: o.id,
            value: o.value,
            label: o.label,
          })),
          sexOptions: SEX_OPTIONS.map((o) => ({ id: o.id, value: o.value, label: o.label })),
          traits: TRAIT_OPTIONS.map((o) => ({ id: o.id, value: o.value, label: o.label })),
          lookingToMeetOptions: LOOKING_TO_MEET_OPTIONS.map((o) => ({
            value: o.value,
            label: o.label,
          })),
        },
      };
    },

    /** States/provinces of one country (by ISO code) for cascading selects. */
    async statesByCountry(code: string) {
      const [country] = await reference.findCountriesByCodes([code]);
      if (!country) throw AppError.badRequest('Unknown country code', { code });
      return { country, states: await reference.listStatesByCountryId(country.id) };
    },
  };
}

export type ReferenceService = ReturnType<typeof createReferenceService>;

export const referenceService = createReferenceService({ reference: referenceRepository });
