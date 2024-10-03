import { ApiType, DotYouClient } from '@homebase-id/js-lib/core';
import { useSiteData, useExternalOdinId, useIsConnected, useDotYouClient } from '../../../..';

export const AuthorName = ({ odinId, excludeLink }: { odinId?: string; excludeLink?: boolean }) => {
  if (!odinId || odinId === window.location.hostname) return <OwnerName />;

  const identity = useDotYouClient().getIdentity();
  const isConnected = useIsConnected(odinId).data;

  const host = new DotYouClient({
    identity: odinId,
    api: ApiType.Guest,
  }).getRoot();

  if (excludeLink) {
    return <ConnectionName odinId={odinId} />;
  }
  return (
    <a
      href={`${host}${isConnected && identity ? '?youauth-logon=' + identity : ''}`}
      className="hover:underline"
    >
      <ConnectionName odinId={odinId} />
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
