// Shared domain/identity input cleaning, used by the YouAuth login box (here in
// common-app) and the provisioning-app's own-domain signup. One implementation so a
// domain typed anywhere behaves the same.
//
// NOTE: the standalone login-app (packages/apps/login-app) duplicates the separator
// and URL-strip behavior inline (components/loginBox.ts, helpers/identity.ts) - it has
// no dependency on common-app and adding one is currently blocked (auth-gated npm
// registry prevents lockfile regeneration). Keep the behaviors in sync by hand.

// As enforced server side by AsciiDomainNameValidator.MAX_DNS_LABEL_LENGTH
export const MAX_DNS_LABEL_LENGTH = 63;

// A pasted/typed URL reduced to its host: scheme and path dropped, lowercased
export const stripUrlToHost = (value: string) =>
  value
    .replace(/^(https?):\/\//, '')
    .split('/')[0]
    .toLowerCase();

// Space and comma both act as the dot key: space is how people say "dot" out loud,
// comma is the classic fat-finger/mobile-keyboard miss for it
export const replaceDomainSeparators = (value: string) => value.replace(/[\s,]/g, '.');

// A single DNS label: lowercase, only [a-z0-9-], no leading hyphen, server's length cap.
// (The server also rejects trailing hyphens, but stripping them live would fight the
// user mid-word - validity checks catch those at submit.)
export const cleanLabel = (value: string) =>
  value
    .toLocaleLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+/, '')
    .slice(0, MAX_DNS_LABEL_LENGTH);

// Live domain cleaner, applied on every keystroke/paste of a full-domain input:
// URL reduced to host, separators (space/comma) become dots, illegal characters
// stripped, duplicate dots collapsed, each label cleaned. Deliberately KEEPS a single
// trailing dot - the user is probably about to type the next label.
export const cleanDomainInput = (value: string) =>
  replaceDomainSeparators(stripUrlToHost(value))
    .replace(/\.{2,}/g, '.')
    .replace(/^\./, '')
    .split('.')
    .map(cleanLabel)
    .join('.');

// Final domain cleaner, run when input is done (blur/submit): also drops trailing dots
export const cleanDomain = (value: string) => cleanDomainInput(value).replace(/\.+$/, '');

// Caret-aware variant for live inputs. Whenever the cleaner changes the value - even
// same-length changes like A->a or space->dot - a controlled React input (or a manual
// `input.value = ...` assignment) rewrites the DOM value, which throws the caret to the
// end; editing mid-string then jumps. The caret belongs right after the cleaned version
// of everything that preceded it, so clean the prefix to find its new position.
export const cleanDomainInputWithCaret = (
  value: string,
  caret: number | null
): { value: string; caret: number } => {
  const cleaned = cleanDomainInput(value);
  const cleanedPrefix = cleanDomainInput(value.slice(0, caret ?? value.length));
  return { value: cleaned, caret: Math.min(cleanedPrefix.length, cleaned.length) };
};

// Applies a cleaner directly to an input element, keeping the caret in place, and
// returns the cleaned value for the state setter. Syncing the DOM value here makes the
// controlled re-render a no-op (React only rewrites input.value - moving the caret -
// when it differs from the rendered value).
const applyCleanerInPlace = (input: HTMLInputElement, cleaner: (value: string) => string) => {
  const cleaned = cleaner(input.value);
  if (cleaned !== input.value) {
    const caretIndex = input.selectionStart ?? input.value.length;
    const caret = Math.min(cleaner(input.value.slice(0, caretIndex)).length, cleaned.length);
    input.value = cleaned;
    input.setSelectionRange(caret, caret);
  }
  return cleaned;
};

export const cleanDomainInputInPlace = (input: HTMLInputElement): string =>
  applyCleanerInPlace(input, cleanDomainInput);

// For single-label inputs (e.g. the managed-domain name boxes)
export const cleanLabelInPlace = (input: HTMLInputElement): string =>
  applyCleanerInPlace(input, cleanLabel);

// Same in-place pattern for the lighter separator-only cleaning used by the login
// boxes (which must keep ports, so they can't run the full cleaner). Separator
// replacement is 1:1 per character, so the caret index itself is already correct.
export const replaceDomainSeparatorsInPlace = (input: HTMLInputElement): string => {
  const caret = input.selectionStart;
  const replaced = replaceDomainSeparators(input.value);
  if (replaced !== input.value) {
    input.value = replaced;
    if (caret !== null) input.setSelectionRange(caret, caret);
  }
  return replaced;
};
