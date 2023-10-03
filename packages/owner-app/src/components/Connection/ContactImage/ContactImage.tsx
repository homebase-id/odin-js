import { useMemo, useState } from 'react';
import useContact from '../../../hooks/contacts/useContact';
import { ContactConfig } from '../../../provider/contact/ContactTypes';
import FallbackImg from '../../ui/FallbackImg/FallbackImg';
import { Eye, Image, LoadingBlock } from '@youfoundation/common-app';
import { getTwoLettersFromDomain } from '@youfoundation/js-lib/helpers';

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
  canSave?: boolean;
  className?: string;
  fallbackSize?: 'xs';
}) => {
  const { data: contactData, isLoading } = useContact({
    odinId: odinId,
    canSave: canSave,
  }).fetch;

  const nameData = contactData?.name;
  const intials = useMemo(
    () => getInitials(nameData?.displayName, nameData?.givenName, nameData?.surname, odinId),
    [nameData, odinId]
  );

  return (
    <div className={`relative aspect-square ${className || ''}`}>
      {isLoading ? (
        <LoadingBlock className={`aspect-square`} />
      ) : contactData?.imageFileId ? (
        <Image
          fileId={contactData?.imageFileId}
          targetDrive={ContactConfig.ContactTargetDrive}
          fit="cover"
          className="h-full w-full"
        />
      ) : contactData?.imageUrl ? (
        <img src={contactData?.imageUrl} className="h-full w-full" />
      ) : (
        <FallbackImg initials={intials} size={fallbackSize} />
      )}
    </div>
  );
};

export default ContactImage;
