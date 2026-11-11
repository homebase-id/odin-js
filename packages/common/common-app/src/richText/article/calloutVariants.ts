/**
 * Callout variants, as Journal stores them (its #159). Anything else reads as `info`.
 */
export const CALLOUT_VARIANTS = ['info', 'warning', 'tip', 'error'] as const;

export type CalloutVariant = (typeof CALLOUT_VARIANTS)[number];

/** Narrows a stored/parsed value to a known variant; anything else is `info`. */
export function toCalloutVariant(value: unknown): CalloutVariant {
  return CALLOUT_VARIANTS.includes(value as CalloutVariant) ? (value as CalloutVariant) : 'info';
}
