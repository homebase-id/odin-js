import { DnsHealthRecord } from '../../../provider/dns/DnsHealthProvider';

// Pure helpers turning health records into what a DNS provider's form or import expects.

// The zone the owner edits at their provider. Normally the identity domain itself, but an
// identity like id.example.com can live inside the example.com zone - the server reports
// that zone as enclosingZone, and hosts must then be relative to it ("id", "capi.id").
export const zoneOrigin = (records: DnsHealthRecord[], enclosingZone?: string) =>
  enclosingZone || records.find((r) => r.type === 'A' || r.type === 'ALIAS')?.domain || '';

// The records the owner must have, two ways. ALIAS is an either-or alternative to the apex
// A record; showing both would always leave one "failing", so `shown` has ALIAS only when it
// is the one in use. A zone file cannot express ALIAS, so `zone` takes the A record if any.
export const requiredRecords = (records: DnsHealthRecord[]) => {
  const a = records.find((r) => r.type === 'A');
  const alias = records.find((r) => r.type === 'ALIAS');
  const cnames = records.filter((r) => r.type === 'CNAME');
  const shownApex = a?.status !== 'success' && alias?.status === 'success' ? alias : a;
  const zoneApex = a ?? alias;
  return {
    shown: [...(shownApex ? [shownApex] : []), ...cnames],
    zone: [...(zoneApex ? [zoneApex] : []), ...cnames],
  };
};

export const stripDot = (v: string) => v.replace(/\.$/, '');

// ALIAS shows as CNAME: it is a flattened CNAME at the apex
export const displayType = (r: DnsHealthRecord) => (r.type === 'ALIAS' ? 'CNAME' : r.type);

// Host relative to the zone: apex -> "@", www.example.com -> "www"
export const relativeHost = (domain: string, origin: string) => {
  const d = stripDot(domain).toLowerCase();
  const o = stripDot(origin).toLowerCase();
  if (d === o) return '@';
  return d.endsWith(`.${o}`) ? d.slice(0, -(o.length + 1)) : d;
};

// The server sends MX as "10 mx.host" (priority embedded), CNAME/ALIAS/A as a bare host/IP
// and TXT unquoted. Split the MX priority off and drop trailing dots, once, here.
export const normalizeValue = (r: DnsHealthRecord) => {
  if (r.type === 'MX') {
    const [priority, ...rest] = r.value.trim().split(/\s+/);
    return { value: stripDot(rest.join(' ')), priority };
  }
  return { value: r.type === 'TXT' ? r.value : stripDot(r.value), priority: undefined };
};

// TXT strings are capped at 255 chars each; long values (DKIM) become several quoted strings
const quoteTxt = (value: string) =>
  (value.match(/[\s\S]{1,255}/g) ?? [''])
    .map((chunk) => `"${chunk.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
    .join(' ');

// BIND zone file, as Cloudflare/GoDaddy/Route 53/etc. import it. BIND has no ALIAS type, so
// callers pass the apex A record; an ALIAS that does slip through goes out as an apex CNAME,
// which the providers that flatten (Cloudflare) accept and the rest reject loudly.
export const toZoneFile = (records: DnsHealthRecord[], origin: string) => {
  const o = stripDot(origin);
  const lines = records.map((r) => {
    const { value, priority } = normalizeValue(r);
    const type = displayType(r);
    const data =
      type === 'TXT'
        ? quoteTxt(value)
        : type === 'MX'
          ? `${priority} ${value}.`
          : type === 'CNAME' || type === 'NS'
            ? `${value}.`
            : value;
    return `${relativeHost(r.domain, o)}\t3600\tIN\t${type}\t${data}`;
  });
  return [`$ORIGIN ${o}.`, '$TTL 3600', ...lines, ''].join('\n');
};

// Records a publish returned for the owner to add by hand, matched to the health check so
// each keeps its status. They can include more than the check covers, so unmatched ones
// count as not found.
export const manualRecords = (
  publishResult:
    | { dnsRecordsWritten?: boolean; records: Omit<DnsHealthRecord, 'altValue' | 'status'>[] }
    | undefined,
  checked: DnsHealthRecord[],
  origin: string
): DnsHealthRecord[] | undefined =>
  publishResult && !publishResult.dnsRecordsWritten
    ? publishResult.records.map((r) => {
        const domain = r.domain || origin;
        const match = checked.find(
          (h) => h.type === r.type && h.domain === domain && h.value === r.value
        );
        return {
          ...r,
          domain,
          altValue: '',
          status: match?.status ?? 'domainOrRecordNotFound',
        };
      })
    : undefined;
