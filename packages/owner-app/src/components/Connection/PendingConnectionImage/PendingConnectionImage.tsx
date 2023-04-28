import { useState } from 'react';
import useContact from '../../../hooks/contacts/useContact';
import useImage from '../../../hooks/media/useImage';
import { ContactConfig } from '../../../provider/contact/ContactTypes';
import FallbackImg from '../../ui/FallbackImg/FallbackImg';
import { Eye, LoadingParagraph } from '@youfoundation/common-app';

const PendingConnectionImage = ({
  odinId,
  onlyLoadAfterClick,
}: {
  odinId: string;
  onlyLoadAfterClick?: boolean;
}) => {
  const [loadImage, setLoadImage] = useState(false);

  const { data: contactData, isLoading } = useContact({
    odinId: odinId,
    loadPendingProfilePicture: onlyLoadAfterClick ? loadImage : true,
  }).fetch;

  const shouldOnlyLoadAfterClick =
    contactData?.source === 'pending' || contactData?.source === 'public'
      ? onlyLoadAfterClick
      : false;

  const { data: imageUrl } = useImage(
    shouldOnlyLoadAfterClick
      ? loadImage
        ? contactData?.imageFileId || undefined
        : undefined
      : contactData?.imageFileId,
    ContactConfig.ContactTargetDrive
  ).fetch;

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
      ) : contactData?.imageUrl || imageUrl ? (
        <figure className={'relative overflow-hidden'}>
          <img
            src={contactData?.imageUrl ?? imageUrl}
            className="aspect-square w-full object-cover"
          />
        </figure>
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

export default PendingConnectionImage;
