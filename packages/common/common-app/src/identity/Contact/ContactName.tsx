import { useContact, useExternalOdinId } from '../../hooks';

export const ContactName = ({
  odinId,
  canSave,
}: {
  odinId: string | undefined | null;
  canSave: boolean;
}) => {
  const { data: contactData, isLoading } = useContact({
    odinId: odinId || undefined,
    canSave,
  }).fetch;
  const nameData = contactData?.fileMetadata.appData.content?.name;
  const fullName =
    nameData &&
    (nameData.displayName ??
      (nameData.givenName || nameData.surname
        ? `${nameData.givenName ?? ''} ${nameData.surname ?? ''}`
        : undefined));

  const { data: connectionDetails } = useExternalOdinId({
    odinId: odinId || undefined,
  }).fetch;

  if (isLoading) return null;

  return fullName || connectionDetails?.name || null;
};
