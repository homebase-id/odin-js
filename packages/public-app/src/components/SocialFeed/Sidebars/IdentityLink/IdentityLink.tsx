import {
  GetTargetDriveFromProfileId,
  HomePageConfig,
  BuiltInProfiles,
} from '@youfoundation/js-lib';
import { Link } from 'react-router-dom';
import { t } from '@youfoundation/common-app';
import useSiteData from '../../../../hooks/siteData/useSiteData';
import { OwnerName } from '../../../Post/Common/Blocks/Author/Name';
import Image from '../../../Image/Image';

const IdentityLink = ({ className }: { className?: string }) => {
  const { data } = useSiteData();

  return (
    <Link to={`/home`} className={`block ${className ?? ''}`}>
      <div className="relative">
        <Image
          targetDrive={GetTargetDriveFromProfileId(HomePageConfig.DefaultDriveId)}
          fileId={data?.home.headerImageFileId}
          fit="cover"
          className="absolute left-0 right-0 top-0 h-[5rem]"
        />

        <div className="mx-auto max-w-[18rem] pt-[1.5rem]">
          <div className="flex h-full px-5">
            <Image
              targetDrive={GetTargetDriveFromProfileId(BuiltInProfiles.StandardProfileId)}
              fileId={data?.owner.profileImageId}
              className="m-auto aspect-square max-h-[7rem] w-full max-w-[7rem] rounded-full border-2 border-neutral-200"
              fit="cover"
            />
          </div>
        </div>
        <p className="pb-4 pt-3 text-center">
          <OwnerName />
          <small className="block text-sm text-slate-400">{t('View your online identity')}</small>
        </p>
      </div>
    </Link>
  );
};

export default IdentityLink;
