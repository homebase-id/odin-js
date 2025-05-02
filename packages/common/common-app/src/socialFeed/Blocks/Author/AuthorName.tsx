import { ApiType, OdinClient } from '@homebase-id/js-lib/core';
import {
  useSiteData,
  useExternalOdinId,
  useIsConnected,
  useOdinClientContext,
  ContactName,
} from '../../../..';

export const AuthorName = ({ odinId, excludeLink }: { odinId?: string; excludeLink?: boolean }) => {
  if (!odinId || odinId === window.location.hostname) return <OwnerName />;

  const loggedInIdentity = useOdinClientContext().getLoggedInIdentity();
  const isConnected = useIsConnected(odinId).data;

  const host = new OdinClient({
    hostIdentity: odinId,
    api: ApiType.Guest,
  }).getRoot();

  const nameOnly = isConnected ? (
    <ContactName odinId={odinId} canSave={true} />
  ) : (
    <ConnectionName odinId={odinId} />
  );

  if (excludeLink) {
    return nameOnly;
  }

  return (
    <a
      href={`${host}${isConnected && loggedInIdentity ? '?youauth-logon=' + loggedInIdentity : ''}`}
      className="hover:underline"
    >
      {nameOnly}
    </a>
  );
};

export const OwnerName = () => {
  const { owner } = useSiteData().data ?? {};
  return <>{owner?.displayName}</>;
};

export const ConnectionName = ({ odinId }: { odinId: string | undefined }) => {
  const { data: connectionDetails } = useExternalOdinId({
    odinId: odinId,
  }).fetch;

  if (!odinId) return null;

  const fullName = connectionDetails?.name;

  return <>{fullName ?? odinId}</>;
};
