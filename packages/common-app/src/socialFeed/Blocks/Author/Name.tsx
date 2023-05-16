import { useSiteData, useExternalOdinId } from '../../../..';

export const AuthorName = ({ odinId }: { odinId?: string }) => {
  if (!odinId || odinId === window.location.hostname) {
    return <OwnerName />;
  }
  return (
    <a href={`https://${odinId}`} className="hover:underline">
      <ConnectionName odinId={odinId} />
    </a>
  );
};

export const OwnerName = () => {
  const { owner } = useSiteData().data ?? {};

  return <>{owner?.displayName}</>;
};

export const ConnectionName = ({ odinId }: { odinId: string }) => {
  const { data: connectionDetails } = useExternalOdinId({
    odinId: odinId,
  }).fetch;

  const fullName = connectionDetails?.name;

  return <>{fullName ?? odinId}</>;
};
