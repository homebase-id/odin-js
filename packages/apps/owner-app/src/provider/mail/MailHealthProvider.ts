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
