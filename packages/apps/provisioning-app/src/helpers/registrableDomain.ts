// Determines the registrable domain (the "apex" a registrar hands out) from a domain
// name alone: the label directly below the public suffix. E.g.:
//   demo.seifert.page -> seifert.page   (subdomain)
//   seifert.page      -> seifert.page   (apex)
//   acme.co.uk        -> acme.co.uk     (apex - co.uk is a public suffix)
//   www.acme.co.uk    -> acme.co.uk     (subdomain)
//
// Deliberately name-based: a zone-apex DNS lookup cannot be used for this decision,
// because once a subdomain is delegated to Homebase it has its own SOA and becomes
// indistinguishable from an apex.
//
// NOTE: this uses a curated list of common multi-label public suffixes rather than the
// full Public Suffix List. Swap for a PSL-backed library (e.g. tldts) when the monorepo
// npm auth allows adding dependencies. A miss on an exotic suffix means a subdomain is
// treated as an apex, which errs on the side of showing more cautious instructions.
const MULTI_LABEL_PUBLIC_SUFFIXES = new Set([
  // UK
  'co.uk', 'org.uk', 'me.uk', 'ltd.uk', 'plc.uk', 'net.uk', 'ac.uk', 'gov.uk', 'sch.uk', 'nhs.uk',
  // Australia / New Zealand
  'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au', 'id.au', 'asn.au',
  'co.nz', 'net.nz', 'org.nz', 'govt.nz', 'ac.nz', 'geek.nz', 'school.nz',
  // Japan / Korea / China / Taiwan / Hong Kong / Singapore
  'co.jp', 'or.jp', 'ne.jp', 'ac.jp', 'go.jp', 'gr.jp',
  'co.kr', 'or.kr', 'ne.kr', 're.kr', 'go.kr', 'ac.kr',
  'com.cn', 'net.cn', 'org.cn', 'gov.cn', 'edu.cn',
  'com.tw', 'net.tw', 'org.tw', 'edu.tw',
  'com.hk', 'net.hk', 'org.hk', 'edu.hk',
  'com.sg', 'net.sg', 'org.sg', 'edu.sg',
  // Americas
  'com.br', 'net.br', 'org.br', 'gov.br',
  'com.mx', 'org.mx', 'net.mx',
  'com.ar', 'net.ar', 'org.ar',
  'com.co', 'net.co', 'org.co',
  // Europe / Middle East / Africa
  'com.pl', 'net.pl', 'org.pl',
  'com.ua', 'net.ua', 'org.ua', 'in.ua',
  'com.tr', 'net.tr', 'org.tr', 'gen.tr', 'web.tr',
  'co.il', 'org.il', 'net.il', 'ac.il', 'gov.il',
  'co.za', 'org.za', 'net.za', 'web.za',
  'co.ke', 'or.ke', 'ne.ke',
  'com.ng', 'org.ng', 'net.ng',
  'com.eg', 'com.sa', 'com.qa', 'com.kw', 'com.lb',
  // South / Southeast Asia
  'co.in', 'net.in', 'org.in', 'firm.in', 'gen.in', 'ind.in', 'ac.in',
  'co.th', 'in.th', 'ac.th', 'go.th',
  'com.my', 'net.my', 'org.my',
  'com.ph', 'net.ph', 'org.ph',
  'com.vn', 'net.vn', 'org.vn',
  'co.id', 'or.id', 'web.id', 'ac.id', 'my.id',
  'com.pk', 'com.bd', 'com.np',
]);

export const getRegistrableDomain = (domain: string): string | null => {
  const labels = domain.toLowerCase().split('.').filter(Boolean);
  if (labels.length < 2) return null;

  const lastTwo = labels.slice(-2).join('.');
  const suffixLabelCount = MULTI_LABEL_PUBLIC_SUFFIXES.has(lastTwo) ? 2 : 1;

  const neededLabels = suffixLabelCount + 1;
  if (labels.length < neededLabels) return null; // the domain IS a public suffix

  return labels.slice(-neededLabels).join('.');
};

export const isRegistrableApex = (domain: string): boolean => {
  const registrable = getRegistrableDomain(domain);
  // Unknown/invalid shapes err on the side of apex: the instructions shown for an apex
  // are the more cautious ones
  return registrable === null || registrable === domain.toLowerCase();
};
