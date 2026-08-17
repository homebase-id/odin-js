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
// This uses a curated list of common multi-label public suffixes rather than the full
// (ever-growing) Public Suffix List. For suffixes we don't know, the deliberate guess
// is: two-label domains are an apex, three-or-more-label domains are a subdomain of
// the last two labels. That guess is WRONG for an apex under an unlisted multi-label
// suffix (e.g. acme.<cc-suffix> gets subdomain instructions naming a registry zone) -
// which is why the common two-label suffixes below are enumerated. Extend the list
// when a real user hits a miss; swap for a PSL-backed library (e.g. tldts) if the
// monorepo npm auth ever allows adding dependencies.
const MULTI_LABEL_PUBLIC_SUFFIXES = new Set([
  // UK / Ireland
  'co.uk', 'org.uk', 'me.uk', 'ltd.uk', 'plc.uk', 'net.uk', 'ac.uk', 'gov.uk', 'sch.uk', 'nhs.uk',
  // Europe
  'com.es', 'org.es', 'nom.es', 'edu.es', 'gob.es',
  'co.at', 'or.at', 'ac.at', 'gv.at',
  'com.pl', 'net.pl', 'org.pl', 'edu.pl',
  'com.pt', 'org.pt', 'edu.pt',
  'com.gr', 'org.gr', 'net.gr', 'edu.gr',
  'com.ro', 'org.ro', 'nt.ro',
  'com.ua', 'net.ua', 'org.ua', 'in.ua',
  'com.tr', 'net.tr', 'org.tr', 'gen.tr', 'web.tr',
  'com.cy', 'org.cy', 'net.cy',
  'com.mt', 'org.mt', 'net.mt',
  'eu.org',
  // Middle East / Africa
  'co.il', 'org.il', 'net.il', 'ac.il', 'gov.il',
  'co.za', 'org.za', 'net.za', 'web.za', 'ac.za',
  'co.ke', 'or.ke', 'ne.ke', 'ac.ke',
  'com.ng', 'org.ng', 'net.ng', 'edu.ng',
  'com.gh', 'org.gh', 'edu.gh',
  'com.eg', 'org.eg', 'edu.eg',
  'com.sa', 'org.sa', 'med.sa', 'edu.sa',
  'com.qa', 'org.qa', 'com.kw', 'com.lb', 'com.jo', 'co.ae',
  'com.tn', 'com.ma', 'co.ma',
  // Asia-Pacific
  'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au', 'id.au', 'asn.au',
  'co.nz', 'net.nz', 'org.nz', 'govt.nz', 'ac.nz', 'geek.nz', 'school.nz',
  'co.jp', 'or.jp', 'ne.jp', 'ac.jp', 'go.jp', 'gr.jp', 'ed.jp',
  'co.kr', 'or.kr', 'ne.kr', 're.kr', 'go.kr', 'ac.kr', 'pe.kr',
  'com.cn', 'net.cn', 'org.cn', 'gov.cn', 'edu.cn',
  'com.tw', 'net.tw', 'org.tw', 'edu.tw', 'idv.tw',
  'com.hk', 'net.hk', 'org.hk', 'edu.hk', 'idv.hk',
  'com.sg', 'net.sg', 'org.sg', 'edu.sg', 'per.sg',
  'com.my', 'net.my', 'org.my', 'edu.my',
  'co.th', 'in.th', 'ac.th', 'go.th', 'or.th',
  'com.ph', 'net.ph', 'org.ph', 'edu.ph',
  'com.vn', 'net.vn', 'org.vn', 'edu.vn',
  'co.id', 'or.id', 'web.id', 'ac.id', 'my.id', 'biz.id',
  'co.in', 'net.in', 'org.in', 'firm.in', 'gen.in', 'ind.in', 'ac.in', 'edu.in',
  'com.pk', 'org.pk', 'edu.pk', 'com.bd', 'org.bd', 'com.np', 'org.np', 'com.lk', 'org.lk',
  // Americas
  'com.br', 'net.br', 'org.br', 'gov.br', 'art.br', 'adv.br',
  'com.mx', 'org.mx', 'net.mx', 'edu.mx', 'gob.mx',
  'com.ar', 'net.ar', 'org.ar', 'edu.ar', 'gob.ar',
  'com.co', 'net.co', 'org.co', 'edu.co',
  'com.pe', 'org.pe', 'net.pe', 'edu.pe', 'gob.pe',
  'com.ve', 'org.ve', 'net.ve', 'co.ve',
  'com.ec', 'org.ec', 'net.ec', 'edu.ec',
  'com.bo', 'org.bo', 'net.bo',
  'com.py', 'org.py', 'net.py', 'edu.py',
  'com.uy', 'org.uy', 'net.uy', 'edu.uy',
  'com.do', 'org.do', 'net.do', 'edu.do',
  'com.gt', 'org.gt', 'net.gt', 'edu.gt',
  'com.sv', 'org.sv', 'com.hn', 'org.hn', 'com.ni', 'org.ni', 'com.pa', 'org.pa',
  'com.pr', 'org.pr', 'com.cu', 'com.jm', 'com.tt',
]);

export const getRegistrableDomain = (domain: string): string | null => {
  const labels = domain.toLowerCase().split('.').filter(Boolean);

  const lastTwo = labels.slice(-2).join('.');
  const suffixLabelCount = MULTI_LABEL_PUBLIC_SUFFIXES.has(lastTwo) ? 2 : 1;

  const neededLabels = suffixLabelCount + 1;
  if (labels.length < neededLabels) return null; // the domain IS a public suffix (or a bare label)

  return labels.slice(-neededLabels).join('.');
};

export const isRegistrableApex = (domain: string): boolean => {
  const registrable = getRegistrableDomain(domain);
  // Unknown/invalid shapes err on the side of apex: the instructions shown for an apex
  // are the more cautious ones
  return registrable === null || registrable === domain.toLowerCase();
};

// The part of the domain in front of the registrable domain ('' for an apex),
// suffix-anchored and case-insensitive: 'www.Acme.co.uk' -> 'www'
export const getSubLabel = (domain: string): string => {
  const lower = domain.toLowerCase();
  const registrable = getRegistrableDomain(lower);
  if (!registrable || registrable === lower) return '';
  return lower.slice(0, lower.length - registrable.length - 1);
};
