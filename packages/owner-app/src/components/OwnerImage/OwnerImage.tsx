import {
  BuiltInProfiles,
  BuiltInAttributes,
  GetTargetDriveFromProfileId,
  MinimalProfileFields,
} from '@youfoundation/js-lib';
import useAttributeVersions from '../../hooks/profiles/useAttributeVersions';
import Image from '../Image/Image';

interface OwnerImageProps {
  className?: string;
  size?: 'sm' | 'md' | 'custom';
}

export const OwnerImage = ({ className, size }: OwnerImageProps) => {
  const { data: photoAttr } = useAttributeVersions({
    profileId: BuiltInProfiles.StandardProfileId,
    type: BuiltInAttributes.Photo,
  }).fetchVersions;

  const targetDrive = GetTargetDriveFromProfileId(BuiltInProfiles.StandardProfileId);

  return (
    <Image
      fileId={photoAttr?.[0]?.data?.[MinimalProfileFields.ProfileImageId]}
      targetDrive={targetDrive}
      className={`${
        size === 'sm' ? 'h-[3rem] w-[3rem]' : size === 'md' ? 'h-[5rem] w-[5rem]' : ''
      } rounded-full object-cover ${className ?? ''}`}
    />
  );
};

export default OwnerImage;
