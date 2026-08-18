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
