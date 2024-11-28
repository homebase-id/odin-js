import { useMemo } from 'react';
import { useContact } from '@homebase-id/common-app';
import { FallbackImg, Image, LoadingBlock } from '@homebase-id/common-app';
import { getTwoLettersFromDomain } from '@homebase-id/js-lib/helpers';
import { CONTACT_PROFILE_IMAGE_KEY, ContactConfig } from '@homebase-id/js-lib/network';
import { HomebaseFile } from '@homebase-id/js-lib/core';

const getInitials = (
  fullName: string | undefined,
  first: string | undefined,
  last: string | undefined,
  domain: string
) => {
  if (fullName) {
    return fullName
      .split(' ')
      .map((part) => part[0] ?? '')
      .join('');
  }

  if (first || last) {
    return (first?.[0] ?? '') + (last?.[0] ?? '') + '';
  }

  return getTwoLettersFromDomain(domain);
};

export const ContactImage = ({
  odinId,
  canSave,
  className,
  fallbackSize,
}: {
  odinId: string | undefined | null;
  canSave: boolean;
  className?: string;
  fallbackSize?: 'xs';
}) => {
  const { data: contactData, isLoading } = useContact({
    odinId: odinId || undefined,
    canSave: canSave,
  }).fetch;

  const contactContent = contactData?.fileMetadata.appData.content;
  const nameData = contactData?.fileMetadata.appData.content.name;
  const intials = useMemo(
    () =>
      odinId && getInitials(nameData?.displayName, nameData?.givenName, nameData?.surname, odinId),
    [nameData, odinId]
  );

  return (
    <div className={`relative aspect-square ${className || ''}`}>
      {isLoading ? (
        <LoadingBlock className={`aspect-square`} />
      ) : (contactData as HomebaseFile<unknown>)?.fileMetadata?.payloads?.some(
          (pyld) => pyld.key === CONTACT_PROFILE_IMAGE_KEY
        ) ? (
        <Image
          fileId={contactData?.fileId}
          fileKey={CONTACT_PROFILE_IMAGE_KEY}
          targetDrive={ContactConfig.ContactTargetDrive}
          lastModified={contactData?.fileMetadata.updated}
          previewThumbnail={contactData?.fileMetadata.appData.previewThumbnail}
          fit="cover"
          className="h-full w-full"
        />
      ) : contactContent?.imageUrl ? (
        <img src={contactContent?.imageUrl} className="h-full w-full" />
      ) : intials ? (
        <FallbackImg initials={intials} size={fallbackSize} />
      ) : null}
    </div>
  );
};
