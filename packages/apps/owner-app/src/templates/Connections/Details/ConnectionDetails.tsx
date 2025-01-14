import { useMatch, useParams } from 'react-router-dom';
import { t, useDetailedConnectionInfo } from '@homebase-id/common-app';
import { ConnectionSummary } from '../../../components/Connection/ConnectionSummary/ConnectionSummary';
import LoadingDetailPage from '../../../components/ui/Loaders/LoadingDetailPage/LoadingDetailPage';
import { IdentityPageMetaAndActions } from './IdentityPageMetaAndActions';
import { IdentityAlerts } from './IdentityAlerts';
import SubMenu from '../../../components/SubMenu/SubMenu';

import { ConnectionDetailsAbout } from './ConnectionDetailsAbout';
import { ConnectionDetailsLinks } from './ConnectionDetailsLinks';
import { ConnectedDetailsSettings } from './ConnectionDetailsSettings';

const ConnectionDetails = () => {
  const settingsMatch = useMatch('/owner/connections/:odinId/settings');
  const settingsActionMatch = useMatch('/owner/connections/:odinId/settings/:action');
  const aboutMatch = useMatch('/owner/connections/:odinId/about');
  const linksMatch = useMatch('/owner/connections/:odinId/links');
  const { odinId } = useParams();

  const {
    fetch: { data: connectionInfo, isLoading: connectionInfoLoading },
  } = useDetailedConnectionInfo({ odinId: odinId });

  if (connectionInfoLoading) return <LoadingDetailPage />;
  if (!odinId) return <>{t('No matching connection found')}</>;

  return (
    <>
      <IdentityPageMetaAndActions odinId={odinId} />
      <SubMenu
        items={[
          {
            path: `/owner/connections/${odinId}`,
            title: t('Info'),
            end: true,
          },
          {
            path: `/owner/connections/${odinId}/about`,
            title: t('About'),
          },
          {
            path: `/owner/connections/${odinId}/links`,
            title: t('Links'),
          },
          connectionInfo?.status === 'connected'
            ? {
                path: `/owner/connections/${odinId}/settings`,
                title: t('Settings'),
              }
            : undefined,
        ]}
        className="mb-4"
      />
      <IdentityAlerts odinId={odinId} />

      {aboutMatch ? (
        <ConnectionDetailsAbout odinId={odinId} />
      ) : linksMatch ? (
        <ConnectionDetailsLinks odinId={odinId} />
      ) : (settingsMatch || settingsActionMatch) && connectionInfo?.status === 'connected' ? (
        <ConnectedDetailsSettings odinId={odinId} connectionInfo={connectionInfo} />
      ) : (
        <ConnectionSummary odinId={odinId} />
      )}
    </>
  );
};

export default ConnectionDetails;
