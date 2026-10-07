import {t} from '@homebase-id/common-app';
import {PageMeta} from '@homebase-id/common-app';
import Submenu from '../../components/SubMenu/SubMenu';
import {useParams} from 'react-router-dom';
import {SecurityOverview} from './SecurityOverview';
import ApproveAndReleaseShardsTabs from "./ApproveAndReleaseShardsTabs";
import {PasswordRecoverySetupTab} from "./PasswordRecoverySetupTab";
import {Lock} from "@homebase-id/common-app/icons";
import {ChangePasswordTab} from "./ChangePasswordTab";
import {DnsSecuritySettings} from "./DnsSecuritySettings";
import {EmailDnsSettings} from "./EmailDnsSettings";
import {useDnsHealth} from "../../hooks/dns/useDnsHealth";
import {useMailHealth} from "../../hooks/mail/useMailHealth";
import {dnssecNeedsOwner} from "./dns/dnssec";

const Security = () => {
  const {sectionId} = useParams();

  // Red dot on the DNS tab when the owner should act: a required record is broken, or the
  // DNSSEC chain is not anchored - the same set the server's monthly health report flags
  // (dnssecNeedsOwner). Since 2026-10-07 that includes parentUnsigned and zoneUnsigned: an
  // unanchored zone weakens security and mail deliverability even when the fix lies with
  // the registrar. A managed domain's enclosing zone is ours to fix and stays off the dot.
  // Shares the DNS tab's query (5 min stale time), so opening the tab costs no extra fetch.
  const {fetchDnsHealth: {data: dnsHealth}} = useDnsHealth();
  const dnsNeedsAttention =
    !!dnsHealth && (!dnsHealth.recordsAreValid || dnssecNeedsOwner(dnsHealth.dnssec));

  // Same treatment for email. No records at all means email is not set up - nothing to act
  // on, so no dot. The dot covers the SAME set the Email tab and the monthly security health
  // report act on: broken mail DNS records, plus the checks a record comparison cannot make
  // (DKIM pair proof, public-key drift), and the outbound relay refusing the domain. Errors
  // only - warnings are things we could not check, and a dot that cries wolf gets ignored.
  const emailRecords = dnsHealth?.mailRecords ?? [];
  const {fetchMailHealth: {data: mailHealth}} = useMailHealth({enabled: emailRecords.length > 0});
  const emailNeedsAttention =
    emailRecords.some((record) => record.status !== 'success') ||
    (mailHealth?.errors?.length ?? 0) > 0 ||
    !!dnsHealth?.relay.needsAttention;

  return (
    <>
      <PageMeta icon={Lock} title={`${t('Security')}`}/>
      <Submenu
        items={[
          {
            title: `Status`,
            path: `/owner/security/overview`,
          },
          {
            title: "Change Password",
            path: `/owner/security/change-password`,
          },
          {
            title: `Password Recovery`,
            path: `/owner/security/password-recovery`,
          },
          {
            title: `Account Recovery Requests`,
            path: `/owner/security/release-shards`,
          },
          {
            title: (
              <span className="flex flex-row items-center gap-2">
                DNS
                {dnsNeedsAttention ? (
                  <span className="inline-block h-2 w-2 rounded-full bg-red-500"/>
                ) : null}
              </span>
            ),
            text: dnsNeedsAttention ? 'DNS •' : 'DNS',
            path: `/owner/security/dns`,
          },
          {
            title: (
              <span className="flex flex-row items-center gap-2">
                Email
                {emailNeedsAttention ? (
                  <span className="inline-block h-2 w-2 rounded-full bg-red-500"/>
                ) : null}
              </span>
            ),
            text: emailNeedsAttention ? 'Email •' : 'Email',
            path: `/owner/security/email`,
          },
        ]}
        className="mb-4"
      />
      {(sectionId === 'overview' || !sectionId) && <SecurityOverview/>}
      {sectionId === 'change-password' && <ChangePasswordTab/>}
      {sectionId === 'password-recovery' && <PasswordRecoverySetupTab/>}
      {sectionId === 'release-shards' && <ApproveAndReleaseShardsTabs/>}
      {sectionId === 'dns' && <DnsSecuritySettings/>}
      {sectionId === 'email' && <EmailDnsSettings/>}
    </>
  );
};

export default Security;
