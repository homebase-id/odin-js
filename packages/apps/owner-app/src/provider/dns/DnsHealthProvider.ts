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
  dsToPublish: DsRecord[];
  parentDsRecords: DsRecord[];
  parentZoneSigned: boolean;
}

export interface DnsHealth {
  records: DnsHealthRecord[];
  recordsAreValid: boolean;
  // The email record set - MX, SPF, DMARC, MTA-STS, TLS-RPT and the tenant's DKIM keys.
  // Server-side these are the Optional-flagged records: they are deliberately excluded
  // from recordsAreValid, because that verdict gates certificate issuance and a missing
  // mail record must never block a certificate. Empty when tenant mail is not enabled.
  mailRecords: DnsHealthRecord[];
  optionalRecords: OptionalDnsRecord[];
  dnssec: DnssecHealth;
}

export const getDnsHealth = async (dotYouClient: DotYouClient): Promise<DnsHealth> => {
  const client = dotYouClient.createAxiosClient();
  const response = await client.get<DnsHealth>(`${root}/status`);
  return response.data;
};
