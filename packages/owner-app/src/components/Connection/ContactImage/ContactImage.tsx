import { useState } from 'react';
import useContact from '../../../hooks/contacts/useContact';
import { ContactConfig } from '../../../provider/contact/ContactTypes';
import FallbackImg from '../../ui/FallbackImg/FallbackImg';
import { Eye, Image, LoadingParagraph } from '@youfoundation/common-app';

const ContactImage = ({
  odinId,
  onlyLoadAfterClick,
}: {
  odinId: string;
  onlyLoadAfterClick?: boolean;
}) => {
  const [loadImage, setLoadImage] = useState(false);

  const { data: contactData, isLoading } = useContact({
    odinId: odinId,
    loadPicture: onlyLoadAfterClick ? loadImage : true,
  }).fetch;

  const shouldOnlyLoadAfterClick =
    contactData?.source === 'pending' || contactData?.source === 'public'
      ? onlyLoadAfterClick
      : false;

  // const { data: imageUrl } = useImage(
  //   shouldOnlyLoadAfterClick
  //     ? loadImage
  //       ? contactData?.imageFileId || undefined
  //       : undefined
  //     : contactData?.imageFileId,
  //   ContactConfig.ContactTargetDrive
  // ).fetch;

  const nameData = contactData?.name;
  const getInitials = () => {
    if (nameData) {
      return (
        nameData.displayName
          ?.split(' ')
          .map((part) => part[0] ?? '')
          .join('') ?? (nameData.givenName?.[0] ?? '') + (nameData.surname?.[0] ?? '') + ''
      );
    }

    const splittedDomain = odinId?.split('.');
    if (splittedDomain?.length >= 2) {
      return splittedDomain[0][0] + splittedDomain[1][0] + '';
    }

    return '--';
  };

  return (
    <div className="relative aspect-square">
      {isLoading ? (
        <LoadingParagraph className={`aspect-square`} />
      ) : (shouldOnlyLoadAfterClick && loadImage) || !shouldOnlyLoadAfterClick ? (
        <Image
          fileId={contactData?.imageFileId}
          targetDrive={ContactConfig.ContactTargetDrive}
          fit="cover"
          className="h-full w-full"
        />
      ) : (
        <>
          <FallbackImg initials={getInitials()} />
        </>
      )}
      {shouldOnlyLoadAfterClick === true && (
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
      )}
    </div>
  );
};

export default ContactImage;
