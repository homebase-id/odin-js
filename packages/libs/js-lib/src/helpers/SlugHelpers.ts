/**
 * Slugs: the readable segments of `/apps/{appSlug}/drives/{driveSlug}` and a drive's type slug.
 *
 * Mirrors odin-core's `OdinSlug`. The server requires every slug (app, drive and drive type) to be
 * stated and valid, and never coerces or derives one -- so anything a client sends has to pass
 * {@link isValidSlug} already. Change the rule here only together with the server.
 */
export const SLUG_MAX_LENGTH = 14;

const SLUG_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

/** Shown next to slug inputs; says the same thing {@link isValidSlug} checks. */
export const SLUG_FORMAT_DESCRIPTION = `Lowercase letters, digits and inner hyphens; 1-${SLUG_MAX_LENGTH} characters.`;

export const isValidSlug = (slug: string | null | undefined): slug is string =>
  !!slug && slug.length <= SLUG_MAX_LENGTH && SLUG_PATTERN.test(slug);

const trimHyphens = (value: string) => value.replace(/^-+|-+$/g, '');

/**
 * Best-effort slug from free text (a drive or channel name): lowercased, every run of characters
 * outside `[a-z0-9]` turned into one hyphen, cut to {@link SLUG_MAX_LENGTH}. Returns `undefined` when
 * nothing usable is left (e.g. a name in a non-latin script).
 */
export const toOdinSlug = (text: string | null | undefined): string | undefined => {
  if (!text) return undefined;

  const slug = trimHyphens(
    trimHyphens(
      text
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '') // strip accents so "Café" becomes "cafe", not "caf"
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
    ).slice(0, SLUG_MAX_LENGTH)
  );

  return isValidSlug(slug) ? slug : undefined;
};

/** A slug built from a drive alias (a guid): its first hex characters, which are always valid. */
export const slugFromAlias = (alias: string): string =>
  alias.replace(/-/g, '').toLowerCase().slice(0, SLUG_MAX_LENGTH);

/**
 * A drive slug for a drive the user named at runtime (a feed channel, a community, a profile),
 * unique among `takenSlugs` -- the slugs the owning app's other drives already hold, since drive
 * slugs are unique per owning app.
 *
 * Derived from `name`; when the name yields nothing, from `alias`. A collision gets a numeric
 * suffix (`news`, `news-2`, `news-3`, ...), with the base cut short enough that the result still
 * fits in {@link SLUG_MAX_LENGTH}. If even that runs out (it would take thousands of collisions),
 * the alias-based slug is used, which is unique per drive.
 */
export const deriveUniqueDriveSlug = (
  name: string | null | undefined,
  alias: string,
  takenSlugs: Iterable<string | null | undefined>
): string => {
  const taken = new Set<string>();
  for (const slug of takenSlugs) if (slug) taken.add(slug);

  const base = toOdinSlug(name) ?? slugFromAlias(alias);
  if (!taken.has(base)) return base;

  for (let i = 2; i < 10000; i++) {
    const suffix = `-${i}`;
    const head = trimHyphens(base.slice(0, SLUG_MAX_LENGTH - suffix.length));
    const candidate = head ? `${head}${suffix}` : `${i}`;
    if (isValidSlug(candidate) && !taken.has(candidate)) return candidate;
  }

  return slugFromAlias(alias);
};

/** Throws when `slug` is not a valid slug; `what` names the field in the message. */
export const assertValidSlug = (what: string, slug: string | null | undefined): string => {
  if (!isValidSlug(slug))
    throw new Error(`${what} '${slug ?? ''}' is not a valid slug. ${SLUG_FORMAT_DESCRIPTION}`);
  return slug;
};
