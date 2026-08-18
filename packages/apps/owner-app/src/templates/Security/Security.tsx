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
import {useDnsHealth} from "../../hooks/dns/useDnsHealth";

const Security = () => {
  const {sectionId} = useParams();

  // Red dot on the DNS tab only when the user should act: a required record is broken,
  // or a stale DS makes validating resolvers refuse the domain. The optional-hardening
  // state (dsMissing) deliberately does NOT light it up. Shares the DNS tab's query
  // (5 min stale time), so opening the tab costs no extra fetch.
  const {fetchDnsHealth: {data: dnsHealth}} = useDnsHealth();
  const dnsNeedsAttention =
    !!dnsHealth && (!dnsHealth.recordsAreValid || dnsHealth.dnssec.status === 'dsMismatch');

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
        ]}
        className="mb-4"
      />
      {(sectionId === 'overview' || !sectionId) && <SecurityOverview/>}
      {sectionId === 'change-password' && <ChangePasswordTab/>}
      {sectionId === 'password-recovery' && <PasswordRecoverySetupTab/>}
      {sectionId === 'release-shards' && <ApproveAndReleaseShardsTabs/>}
      {sectionId === 'dns' && <DnsSecuritySettings/>}
    </>
  );
};

export default Security;
