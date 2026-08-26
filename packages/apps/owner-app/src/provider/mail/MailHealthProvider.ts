import { DotYouClient } from '@homebase-id/js-lib/core';

// GET /api/owner/v1/mail/verify - live per-tenant email checks that a DNS record
// comparison cannot make: the DKIM pair proof (sign a test vector with the stored
// private key, verify it against the public key in the live DNS TXT) and public-key
// drift across the publication surfaces (WKD, DID).
//
// Heavier than the DNS status call - it signs and makes outbound HTTPS requests - so
// callers should only run it for identities that actually have email set up.
const root = '/mail';

export interface MailHealth {
  // False when email was never activated for this identity; errors/warnings are then empty
  // and there is nothing to report rather than everything looking broken.
  activated: boolean;
  errors: string[];
  warnings: string[];
}

export const getMailHealth = async (dotYouClient: DotYouClient): Promise<MailHealth> => {
  const client = dotYouClient.createAxiosClient();
  const response = await client.get<MailHealth>(`${root}/verify`);
  return response.data;
};

// POST /api/owner/v1/mail/publish-dns-records - (re)writes this identity's static mail DNS
// records (MX, SPF, DMARC, MTA-STS, TLS-RPT, mta-sts CNAME) into whichever zone holds the
// tenant's records.
//
// Those records are written at provisioning time, so an identity provisioned before tenant
// mail was enabled never received them: it ends up with a working mailbox, valid DKIM, and
// no MX to receive on. This is the owner's fix for that.
//
// dnsRecordsWritten is false - with records still populated - when the tenant's DNS is not
// ours to write (third-party DNS, or a host without PowerDNS access). Show them as manual
// instructions in that case rather than reporting a failure.
export interface MailDnsRecord {
  type: string;
  name: string;
  domain: string;
  value: string;
  description: string;
}

export interface MailDnsPublishResult {
  dnsRecordsWritten: boolean;
  records: MailDnsRecord[];
}

export const publishMailDnsRecords = async (
  dotYouClient: DotYouClient
): Promise<MailDnsPublishResult> => {
  const client = dotYouClient.createAxiosClient();
  const response = await client.post<MailDnsPublishResult>(`${root}/publish-dns-records`);
  return response.data;
};
