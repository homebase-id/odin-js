import { useSiteData, useExternalOdinId, useIsConnected, useDotYouClient } from '../../../..';

export const AuthorName = ({ odinId }: { odinId?: string }) => {
  if (!odinId || odinId === window.location.hostname) return <OwnerName />;

  const identity = useDotYouClient().getIdentity();
  const isConnected = useIsConnected(odinId).data;

  return (
    <a
      href={`https://${odinId}${isConnected && identity ? '?youauth-logon=' + identity : ''}`}
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
