import { useMatch, useParams } from 'react-router-dom';
import { NotFound, t } from '@homebase-id/common-app';
import { useConnection } from '../../../hooks/connections/useConnection';
import { useContact } from '../../../hooks/contacts/useContact';
import ContactInfo from '../../../components/Connection/ContactInfo/ContactInfo';
import LoadingDetailPage from '../../../components/ui/Loaders/LoadingDetailPage/LoadingDetailPage';
import { IdentityPageMetaAndActions } from './IdentityPageMetaAndActions';
import { IdentityAlerts } from './IdentityAlerts';
import SubMenu from '../../../components/SubMenu/SubMenu';

import { ConnectionDetailsAbout } from './ConnectionDetailsAbout';
import { ConnectionDetailsLinks } from './ConnectionDetailsLinks';
import { ConnectedDetailsSettings } from './ConnectionDetailsSettings';

const ConnectionDetails = () => {
  const rootMatch = useMatch('/owner/connections/:odinId');
  const settingsMatch = useMatch('/owner/connections/:odinId/settings');
  const aboutMatch = useMatch('/owner/connections/:odinId/about');
  const linksMatch = useMatch('/owner/connections/:odinId/links');
  const { odinId } = useParams();

  const {
    fetch: { data: connectionInfo, isLoading: connectionInfoLoading },
  } = useConnection({ odinId: odinId });

  const { data: contactData, isLoading: contactDataLoading } = useContact({
    odinId: odinId,
    canSave: connectionInfo?.status === 'connected',
  }).fetch;

  if (connectionInfoLoading || contactDataLoading) return <LoadingDetailPage />;
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
        className="-mt-6 mb-4"
      />

      <IdentityAlerts odinId={odinId} />

      {rootMatch ? (
        <>{contactData && <ContactInfo odinId={odinId} />}</>
      ) : aboutMatch ? (
        <ConnectionDetailsAbout odinId={odinId} />
      ) : linksMatch ? (
        <ConnectionDetailsLinks odinId={odinId} />
      ) : settingsMatch && connectionInfo?.status === 'connected' ? (
        <ConnectedDetailsSettings odinId={odinId} connectionInfo={connectionInfo} />
      ) : (
        <NotFound />
      )}
    </>
  );
};

export default ConnectionDetails;
