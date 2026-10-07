import { DnssecHealth } from '../../../provider/dns/DnsHealthProvider';

// Ours to fix: a managed domain whose enclosing zone is not anchored
export const enclosingZoneIncomplete = (dnssec: DnssecHealth) =>
  dnssec.status === 'inherited' &&
  !!dnssec.enclosingZoneStatus &&
  dnssec.enclosingZoneStatus !== 'secure';

// One reading of how bad the DNSSEC state is, for the panel and the tab dot alike.
// Red only when validating resolvers refuse the domain (a DS mismatch, on the zone or on the
// apex it inherits): that stops web and mail. Every other gap is orange - mail still works,
// but without the chain of trust there is no DANE, and deliverability suffers a little.
export type DnssecTone = 'red' | 'orange' | 'unknown' | 'none';

export const dnssecTone = (dnssec: DnssecHealth): DnssecTone => {
  if (dnssec.lookupFailed) return 'unknown';
  // dsMismatch is the fallback for servers that predate breaksResolution
  if (dnssec.breaksResolution || dnssec.status === 'dsMismatch') return 'red';
  if (dnssec.needsAttention || enclosingZoneIncomplete(dnssec)) return 'orange';
  return 'none';
};

// Anything not green on the panel: expands the record list
export const dnssecNotGreen = (dnssec: DnssecHealth) => {
  const tone = dnssecTone(dnssec);
  return tone === 'red' || tone === 'orange';
};

// The zone one label up, where a DS for this domain would have to live
export const parentZone = (origin: string) => origin.split('.').slice(1).join('.');
