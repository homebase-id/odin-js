import { HomePageConfig } from '@homebase-id/js-lib/public';
import {
  OwnerName,
  t,
  useSiteData,
  Image,
  HOME_ROOT_PATH,
  ThemeLinksSettings,
  useOdinClientContext,
} from '@homebase-id/common-app';
import { BuiltInProfiles, GetTargetDriveFromProfileId } from '@homebase-id/js-lib/profile';
import { ApiType, OdinClient } from '@homebase-id/js-lib/core';

const IdentityLink = ({ className }: { className?: string }) => {
  const { data } = useSiteData();
  const odinId = useOdinClientContext().getHostIdentity();

  const host = new OdinClient({ hostIdentity: odinId, api: ApiType.Guest }).getRoot();
  return (
    <a href={`${host}${HOME_ROOT_PATH}`} className={`block ${className ?? ''}`}>
      <div className="relative">
        <Image
          targetDrive={HomePageConfig.HomepageTargetDrive}
          fileId={(data?.home?.templateSettings as ThemeLinksSettings)?.imageFileId}
          fileKey={(data?.home?.templateSettings as ThemeLinksSettings)?.headerImageKey}
          lastModified={(data?.home?.templateSettings as ThemeLinksSettings)?.imageLastModified}
          previewThumbnail={data?.home?.headerPreviewThumbnail}
          fit="cover"
          className="absolute left-0 right-0 top-0 h-[5rem]"
          odinId={odinId}
        />

        <div className="mx-auto max-w-[18rem] pt-[1.5rem]">
          <div className="flex h-full px-5">
            <Image
              targetDrive={GetTargetDriveFromProfileId(BuiltInProfiles.StandardProfileId)}
              fileId={data?.owner.profileImageFileId}
              fileKey={data?.owner.profileImageFileKey}
              lastModified={data?.owner.profileImageLastModified}
              previewThumbnail={data?.owner.profileImagePreviewThumbnail}
              className="m-auto aspect-square max-h-[7rem] w-full max-w-[7rem] rounded-full border-2 border-neutral-200"
              fit="cover"
              odinId={odinId}
            />
          </div>
        </div>
        <p className="pb-4 pt-3 text-center">
          <OwnerName />
          <small className="block text-sm text-slate-400">{t('View your online identity')}</small>
        </p>
      </div>
    </a>
  );
};

export default IdentityLink;
