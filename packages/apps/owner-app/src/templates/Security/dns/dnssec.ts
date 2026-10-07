import { DnssecHealth, DnssecStatus } from '../../../provider/dns/DnsHealthProvider';

// One reading of the DNSSEC verdict for the DNS panel and the tab dot, so they cannot disagree.

// States the owner should act on - the same set the server's monthly health report flags
// (DnsHealthService.NeedsUserAttention). Missing DNSSEC is no longer "that is fine": an
// unanchored zone weakens both the identity's security and its mail deliverability.
const OWNER_STATES: DnssecStatus[] = ['dsMismatch', 'dsMissing', 'parentUnsigned', 'zoneUnsigned'];

export const dnssecNeedsOwner = (dnssec: DnssecHealth) => OWNER_STATES.includes(dnssec.status);

// Ours to fix: a managed domain whose enclosing zone is not anchored
export const enclosingZoneIncomplete = (dnssec: DnssecHealth) =>
  dnssec.status === 'inherited' &&
  !!dnssec.enclosingZoneStatus &&
  dnssec.enclosingZoneStatus !== 'secure';

// Anything not green on the panel: expands the record list
export const dnssecNotGreen = (dnssec: DnssecHealth) =>
  dnssecNeedsOwner(dnssec) || enclosingZoneIncomplete(dnssec);

// The zone one label up, where a DS for this domain would have to live
export const parentZone = (origin: string) => origin.split('.').slice(1).join('.');
