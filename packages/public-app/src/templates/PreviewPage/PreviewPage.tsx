import { useSiteData, OwnerName } from '@youfoundation/common-app';
import { HomePageConfig } from '@youfoundation/js-lib/public';
import { GetTargetDriveFromProfileId, BuiltInProfiles } from '@youfoundation/js-lib/profile';
import { Image } from '@youfoundation/common-app';

const PreviewPage = () => {
  const { owner, home } = useSiteData().data ?? {};

  const targetDrive = GetTargetDriveFromProfileId(BuiltInProfiles.StandardProfileId);
  const showProfileImage = owner?.profileImageId && targetDrive;

  return (
    <section className="flex h-56 max-w-2xl flex-col bg-background">
      <div className="relative h-24">
        <Image
          fileId={home?.headerImageFileId}
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
              fileId={owner?.profileImageId}
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
