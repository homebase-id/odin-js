import { t, useConnectionGrantStatus } from '@homebase-id/common-app';
import { ConnectionInfo } from '@homebase-id/js-lib/network';
import { ConnectionPermissionViewer } from './ConnectionPermissionViewer';
import { CircleMembershipDialog } from '../../../components/Circles/CircleMembershipDialog/CircleMembershipDialog';
import { useNavigate, useParams } from 'react-router-dom';
import { useFocusedEditing } from '../../../hooks/focusedEditing/useFocusedEditing';

export const ConnectedDetailsSettings = ({
  odinId,
  connectionInfo,
}: {
  odinId: string;
  connectionInfo: ConnectionInfo;
}) => {
  const { action } = useParams();
  const isEditPermissionActive = action === 'circles';
  const navigate = useNavigate();

  const { data: grantStatus } = useConnectionGrantStatus({
    odinId: connectionInfo?.status === 'connected' ? odinId : undefined,
  }).fetchStatus;

  const activeConnection = connectionInfo as ConnectionInfo;

  const checkRedirectTo = useFocusedEditing();

  return (
    <>
      <ConnectionPermissionViewer
        accessGrant={activeConnection.accessGrant}
        grantStatus={grantStatus}
        openEditCircleMembership={() => navigate('circles')}
      />
      <CircleMembershipDialog
        title={`${t('Edit Circle Membership for')} ${odinId}`}
        isOpen={isEditPermissionActive}
        odinId={odinId}
        currentCircleGrants={activeConnection.accessGrant.circleGrants}
        onCancel={() => {
          if (checkRedirectTo()) return;
          navigate(-1);
        }}
        onConfirm={() => {
          if (checkRedirectTo()) return;
          navigate(-1);
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
