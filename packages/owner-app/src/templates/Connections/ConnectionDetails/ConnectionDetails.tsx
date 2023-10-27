import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { t } from '@youfoundation/common-app';
import { useConnection } from '../../../hooks/connections/useConnection';
import { useContact } from '../../../hooks/contacts/useContact';
import ContactInfo from '../../../components/Connection/ContactInfo/ContactInfo';
import { CircleMembershipDialog } from '../../../components/Dialog/CircleMembershipDialog/CircleMembershipDialog';
import LoadingDetailPage from '../../../components/ui/Loaders/LoadingDetailPage/LoadingDetailPage';
import { ConnectionInfo } from '@youfoundation/js-lib/network';
import { ConnectionPermissionViewer } from './ConnectionPermissionViewer';
import { IdentityPageMetaAndActions } from './IdentityPageMetaAndActions';
import { IdentityAlerts } from './IdentityAlerts';

const ConnectionDetails = () => {
  const { odinId } = useParams();
  const [isEditPermissionActive, setIsEditPermissionActive] = useState(false);

  const {
    fetch: { data: connectionInfo, isLoading: connectionInfoLoading },
  } = useConnection({ odinId: odinId });
  const { data: contactData } = useContact({ odinId: odinId }).fetch;

  if (connectionInfoLoading) return <LoadingDetailPage />;
  if ((!connectionInfo && !contactData) || !odinId) return <>{t('No matching connection found')}</>;

  const activeConnection = connectionInfo as ConnectionInfo;

  return (
    <>
      <IdentityPageMetaAndActions
        odinId={odinId}
        setIsEditPermissionActive={setIsEditPermissionActive}
      />

      <IdentityAlerts odinId={odinId} />

      {contactData && <ContactInfo odinId={odinId} />}

      {connectionInfo?.status === 'connected' ? (
        <>
          <ConnectionPermissionViewer
            accessGrant={activeConnection.accessGrant}
            openEditCircleMembership={() => setIsEditPermissionActive(true)}
          />
          <CircleMembershipDialog
            title={`${t('Edit Circle Membership for')} ${odinId}`}
            isOpen={isEditPermissionActive}
            odinId={odinId}
            currentCircleGrants={activeConnection.accessGrant.circleGrants}
            onCancel={() => {
              setIsEditPermissionActive(false);
            }}
            onConfirm={() => {
              setIsEditPermissionActive(false);
            }}
          />
          <section>
            <p className="text-sm">
              {t('Connected since')}: {new Date(activeConnection.created).toLocaleDateString()}
            </p>
          </section>
        </>
      ) : null}
    </>
  );
};

export default ConnectionDetails;
