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
  onlyLoadAfterClick,
  className,
  fallbackSize,
}: {
  odinId: string;
  onlyLoadAfterClick?: boolean;
  className?: string;
  fallbackSize?: 'xs';
}) => {
  // Deprecated "shouldOnlyLoadAfterClick";
  // const [loadImage, setLoadImage] = useState(false);

  const { data: contactData, isLoading } = useContact({
    odinId: odinId,
    canSave: onlyLoadAfterClick,
  }).fetch;
  // const shouldOnlyLoadAfterClick = false;

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
      {/* {shouldOnlyLoadAfterClick ? (
        <button
          className="absolute bottom-2 right-2 bg-white bg-opacity-60 p-2 hover:bg-opacity-100 dark:bg-black dark:bg-opacity-60 hover:dark:bg-opacity-100"
          onClick={(e) => {
            e.preventDefault();
            setLoadImage(!loadImage);
            return false;
          }}
        >
          <Eye className="h-4 w-4" />
          {loadImage && (
            <span className="absolute bottom-[0.9rem] right-[0.2rem] block w-[1.5rem] rotate-45 border-b-[2px] border-black dark:border-white"></span>
          )}
        </button>
      ) : null} */}
    </div>
  );
};

export default ContactImage;
