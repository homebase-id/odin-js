import { useState } from 'react';
import { t } from '@homebase-id/common-app';
import { ConnectionInfo } from '@homebase-id/js-lib/network';
import { ConnectionPermissionViewer } from './ConnectionPermissionViewer';
import { useConnectionGrantStatus } from '../../../hooks/connections/useConnectionGrantStatus';
import { CircleMembershipDialog } from '../../../components/Circles/CircleMembershipDialog/CircleMembershipDialog';

export const ConnectedDetailsSettings = ({
  odinId,
  connectionInfo,
}: {
  odinId: string;
  connectionInfo: ConnectionInfo;
}) => {
  const [isEditPermissionActive, setIsEditPermissionActive] = useState(false);
  const { data: grantStatus } = useConnectionGrantStatus({
    odinId: connectionInfo?.status === 'connected' ? odinId : undefined,
  }).fetchStatus;

  const activeConnection = connectionInfo as ConnectionInfo;

  return (
    <>
      <ConnectionPermissionViewer
        accessGrant={activeConnection.accessGrant}
        grantStatus={grantStatus}
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
  );
};
