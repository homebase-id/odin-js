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
import {dnsTabTone, emailNeedsAttention as computeEmailNeedsAttention, TabTone} from "./dns/attention";

const Dot = ({tone}: { tone: TabTone }) => (
  <span className={`inline-block h-2 w-2 rounded-full ${tone === 'red' ? 'bg-red-500' : 'bg-orange-400'}`}/>
);

const Security = () => {
  const {sectionId} = useParams();

  // Both dots come from dns/attention.ts. Shares the DNS tab's query (5 min stale time), so
  // it costs no extra fetch.
  const {fetchDnsHealth: {data: dnsHealth}} = useDnsHealth();
  const dnsDot = dnsTabTone(dnsHealth);

  // Same treatment for email, by the same rule the Email tab uses. No records at all means
  // email is not set up - nothing to act on, so no dot (and no expensive verify call).
  const emailRecords = dnsHealth?.mailRecords ?? [];
  const {fetchMailHealth: {data: mailHealth}} = useMailHealth({enabled: emailRecords.length > 0});
  // Everything on the email list stops or spam-folders mail, so its dot is always red
  const emailNeedsAttention = computeEmailNeedsAttention(dnsHealth, mailHealth);

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
                {dnsDot ? <Dot tone={dnsDot}/> : null}
              </span>
            ),
            text: dnsDot ? 'DNS •' : 'DNS',
            path: `/owner/security/dns`,
          },
          {
            title: (
              <span className="flex flex-row items-center gap-2">
                Email
                {emailNeedsAttention ? <Dot tone="red"/> : null}
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
