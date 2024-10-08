import { useSiteData, OwnerName, ThemeLinksSettings } from '@homebase-id/common-app';
import { HomePageConfig } from '@homebase-id/js-lib/public';
import { GetTargetDriveFromProfileId, BuiltInProfiles } from '@homebase-id/js-lib/profile';
import { Image } from '@homebase-id/common-app';

const PreviewPage = () => {
  const { owner, home } = useSiteData().data ?? {};

  const targetDrive = GetTargetDriveFromProfileId(BuiltInProfiles.StandardProfileId);
  const showProfileImage = owner?.profileImageFileKey && targetDrive;

  return (
    <section className="flex h-56 max-w-2xl flex-col bg-background">
      <div className="relative h-24">
        <Image
          fileId={(home?.templateSettings as ThemeLinksSettings)?.imageFileId}
          fileKey={(home?.templateSettings as ThemeLinksSettings)?.headerImageKey}
          lastModified={(home?.templateSettings as ThemeLinksSettings)?.imageLastModified}
          targetDrive={HomePageConfig.HomepageTargetDrive}
          className="absolute inset-0"
          fit="cover"
        />
      </div>
      <div
        className={`flex flex-grow flex-col items-center justify-center ${
          showProfileImage ? '-mt-12' : ''
        }`}
      >
        {showProfileImage ? (
          <div className="h-24 w-24 overflow-hidden rounded-full bg-background">
            <Image
              fileId={owner?.profileImageFileId}
              fileKey={owner?.profileImageFileKey}
              previewThumbnail={owner?.profileImagePreviewThumbnail}
              lastModified={owner?.profileImageLastModified}
              targetDrive={targetDrive}
              className="h-full w-full"
              fit="cover"
            />
          </div>
        ) : null}

        <div className={`my-auto flex flex-col px-5 text-center`}>
          <h1 className="text-xl">
            <OwnerName />
          </h1>
          <small className="block text-base text-slate-600">{owner?.status}</small>
        </div>
      </div>
    </section>
  );
};
export default PreviewPage;
