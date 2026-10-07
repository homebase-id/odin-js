import { DotYouClient } from '@homebase-id/js-lib/core';

// GET /api/owner/v1/dns/status - read-only DNS health for the owner's own domain:
// required-record status, the optional www record, and the DNSSEC chain of trust.
// Server-side it is built entirely on generic public-DNS lookups, so the shape is the
// same whether the zone is hosted by Homebase, a third party, or self-hosted.
const root = '/dns';

export interface DnsHealthRecord {
  type: string; // A | ALIAS | CNAME | NS
  name: string;
  domain: string;
  value: string;
  altValue: string;
  description: string;
  status: string; // unknown | success | domainOrRecordNotFound | incorrectValue | ...
  records?: Record<string, string[]>;
}

export type OptionalRecordStatus = 'success' | 'notSet' | 'pointsElsewhere';

export interface OptionalDnsRecord {
  name: string;
  domain: string;
  status: OptionalRecordStatus;
  found: string[];
}

export type DnssecStatus =
  | 'inherited'
  | 'zoneUnsigned'
  | 'parentUnsigned'
  | 'dsMissing'
  | 'dsMismatch'
  | 'secure';

export interface DsRecord {
  keyTag: number;
  algorithm: number;
  digestType: number;
  digest: string;
}

export interface DnssecHealth {
  status: DnssecStatus;
  enclosingZone: string;
  // When status is 'inherited': how the enclosing zone itself grades. Ours to fix, not the
  // owner's, so it colours the panel but never the tab dot.
  enclosingZoneStatus?: DnssecStatus | null;
  // The server's verdict (the same rule as its monthly health report), so the dot needs no copy
  needsAttention: boolean;
  dsToPublish: DsRecord[];
  parentDsRecords: DsRecord[];
  parentZoneSigned: boolean;
}

// The outbound relay's verdict on this identity's domain. notRegistered is the case that used
// to be invisible: the relay refused the domain, so there were no relay rows to show as broken.
export type MailRelayStatus =
  | 'notApplicable'
  | 'registered'
  | 'unverified'
  | 'notRegistered'
  | 'unreachable';

export interface MailRelayHealth {
  status: MailRelayStatus;
  // The relay's own per-record diagnostics, verbatim
  problems: string[];
  // Why the relay last refused the domain, in its own words
  lastError?: string | null;
  // The verdict described for a human, null when nothing needs attention - the same wording
  // the monthly email uses, so the client shows it rather than writing its own
  problem?: string | null;
  needsAttention: boolean;
}

export interface DnsHealth {
  records: DnsHealthRecord[];
  recordsAreValid: boolean;
  // The email record set - MX, SPF, DMARC, MTA-STS, TLS-RPT and the tenant's DKIM keys.
  // Server-side these are the Optional-flagged records: they are deliberately excluded
  // from recordsAreValid, because that verdict gates certificate issuance and a missing
  // mail record must never block a certificate. Empty when tenant mail is not enabled.
  mailRecords: DnsHealthRecord[];
  // Whether this SERVER does tenant mail at all. Without it an empty mailRecords is
  // ambiguous, and the two cases need opposite messages: false means the server does not
  // offer email and the owner cannot act; true with no records means they have not set it
  // up yet and can.
  tenantMailEnabled: boolean;
  optionalRecords: OptionalDnsRecord[];
  dnssec: DnssecHealth;
  relay: MailRelayHealth;
}

export const getDnsHealth = async (dotYouClient: DotYouClient): Promise<DnsHealth> => {
  const client = dotYouClient.createAxiosClient();
  const response = await client.get<DnsHealth>(`${root}/status`);
  return response.data;
};
