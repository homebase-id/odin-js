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

const Security = () => {
  const {sectionId} = useParams();

  // Red dot on the DNS tab when the user should act: a required record is broken, a
  // stale DS makes validating resolvers refuse the domain, or the DNSSEC chain is not
  // anchored yet (dsMissing - with SMTP/DANE coming, an unanchored chain is a real
  // to-do, not just optional hardening; the server only reports dsMissing when the
  // parent is signed, i.e. when the user can actually fix it). States the user cannot
  // act on (inherited, parentUnsigned, zoneUnsigned) stay quiet. Shares the DNS tab's
  // query (5 min stale time), so opening the tab costs no extra fetch.
  const {fetchDnsHealth: {data: dnsHealth}} = useDnsHealth();
  const dnsNeedsAttention =
    !!dnsHealth &&
    (!dnsHealth.recordsAreValid ||
      dnsHealth.dnssec.status === 'dsMismatch' ||
      dnsHealth.dnssec.status === 'dsMissing');

  // Same treatment for email. No records at all means email is not set up - nothing to act
  // on, so no dot. The dot covers the SAME set the Email tab and the monthly security health
  // report act on: broken mail DNS records, plus the checks a record comparison cannot make
  // (DKIM pair proof, public-key drift). Errors only - warnings are things we could not
  // check, and a dot that cries wolf gets ignored.
  const emailRecords = dnsHealth?.mailRecords ?? [];
  const {fetchMailHealth: {data: mailHealth}} = useMailHealth({enabled: emailRecords.length > 0});
  const emailNeedsAttention =
    emailRecords.some((record) => record.status !== 'success') ||
    (mailHealth?.errors?.length ?? 0) > 0;

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
