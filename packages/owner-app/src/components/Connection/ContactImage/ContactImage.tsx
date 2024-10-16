import { useMemo } from 'react';
import { useContact } from '../../../hooks/contacts/useContact';
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

const ContactImage = ({
  odinId,
  canSave,
  className,
  fallbackSize,
}: {
  odinId: string;
  canSave: boolean;
  className?: string;
  fallbackSize?: 'xs';
}) => {
  const { data: contactData, isLoading } = useContact({
    odinId: odinId,
    canSave: canSave,
  }).fetch;

  const contactContent = contactData?.fileMetadata.appData.content;
  const nameData = contactData?.fileMetadata.appData.content.name;
  const intials = useMemo(
    () => getInitials(nameData?.displayName, nameData?.givenName, nameData?.surname, odinId),
    [nameData, odinId]
  );

  return (
    <div className={`relative aspect-square ${className || ''}`}>
      {isLoading ? (
        <LoadingBlock className={`aspect-square`} />
      ) : (contactData as HomebaseFile<unknown>)?.fileMetadata?.payloads?.some((pyld) =>
          pyld.contentType.startsWith('image/')
        ) ? (
        <Image
          fileId={contactData?.fileId}
          fileKey={CONTACT_PROFILE_IMAGE_KEY}
          targetDrive={ContactConfig.ContactTargetDrive}
          lastModified={(contactData as HomebaseFile<unknown>).fileMetadata.updated}
          fit="cover"
          className="h-full w-full"
        />
      ) : contactContent?.imageUrl ? (
        <img src={contactContent?.imageUrl} className="h-full w-full" />
      ) : (
        <FallbackImg initials={intials} size={fallbackSize} />
      )}
    </div>
  );
};

export default ContactImage;
