import { DnssecHealth } from '../../../provider/dns/DnsHealthProvider';

// Ours to fix: a managed domain whose enclosing zone is not anchored
export const enclosingZoneIncomplete = (dnssec: DnssecHealth) =>
  dnssec.status === 'inherited' &&
  !!dnssec.enclosingZoneStatus &&
  dnssec.enclosingZoneStatus !== 'secure';

// Anything not green on the panel: expands the record list
export const dnssecNotGreen = (dnssec: DnssecHealth) =>
  dnssec.needsAttention || enclosingZoneIncomplete(dnssec);

// The zone one label up, where a DS for this domain would have to live
export const parentZone = (origin: string) => origin.split('.').slice(1).join('.');
