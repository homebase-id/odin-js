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
