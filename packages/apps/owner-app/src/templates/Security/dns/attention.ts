import { DnsHealth } from '../../../provider/dns/DnsHealthProvider';
import { MailHealth } from '../../../provider/mail/MailHealthProvider';
import { isMissing } from './zoneFile';

// One answer to "does email need the owner", for the Email tab and its dot: broken mail
// records, the checks a record comparison cannot make (DKIM pair proof, key drift), and the
// outbound relay's verdict. Errors only - warnings are things we could not check.
export const emailNeedsAttention = (dnsHealth?: DnsHealth, mailHealth?: MailHealth) =>
  (dnsHealth?.mailRecords ?? []).some(isMissing) ||
  (mailHealth?.errors?.length ?? 0) > 0 ||
  !!dnsHealth?.relay?.needsAttention;

export type TabTone = 'red' | 'orange';

// The DNS tab's dot, from the server's verdicts. Red: a required record is broken, or validating
// resolvers refuse the domain (a DS mismatch, on its zone or on the apex it inherits) - that
// stops web and mail. Orange: the DNSSEC chain is not anchored - mail still works, but without
// DANE and with slightly weaker deliverability. A managed domain's incomplete enclosing zone is
// ours to fix, so it stays off the dot unless it actually breaks resolution.
export const dnsTabTone = (dnsHealth?: DnsHealth): TabTone | null => {
  if (!dnsHealth) return null;
  if (!dnsHealth.recordsAreValid || dnsHealth.dnssec.breaksResolution) return 'red';
  return dnsHealth.dnssec.needsAttention ? 'orange' : null;
};
