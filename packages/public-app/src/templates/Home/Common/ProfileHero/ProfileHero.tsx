import { BuiltInProfiles, GetTargetDriveFromProfileId } from '@homebase-id/js-lib/profile';
import { HomePageConfig } from '@homebase-id/js-lib/public';
import Links from '../../../../components/ui/Layout/Links/Links';
import Socials from '../../../../components/ui/Layout/Socials/Socials';
import ConnectLink from '../../../../components/ConnectionActions/ConnectLink/ConnectLink';
import FollowLink from '../../../../components/ConnectionActions/FollowLink/FollowLink';
import {
  OwnerName,
  Image,
  useSiteData,
  ImageLightbox,
  ThemeLinksSettings,
} from '@homebase-id/common-app';
import { useState } from 'react';

const ProfileHero = ({ hideLinks }: { hideLinks?: boolean }) => {
  const { owner, home } = useSiteData().data ?? {};
  const [isImageLightboxOpen, setIsImageLightboxOpen] = useState(false);

  const targetDrive = GetTargetDriveFromProfileId(BuiltInProfiles.StandardProfileId);

  const showProfileImage = owner?.profileImageFileKey && targetDrive;

  return (
    <>
      <section className="bg-background">
        <div className="relative min-h-[10rem] bg-background">
          <Image
            fileId={(home?.templateSettings as ThemeLinksSettings)?.imageFileId}
            fileKey={(home?.templateSettings as ThemeLinksSettings)?.headerImageKey}
            lastModified={(home?.templateSettings as ThemeLinksSettings)?.imageLastModified}
            targetDrive={HomePageConfig.HomepageTargetDrive}
            previewThumbnail={home?.headerPreviewThumbnail}
            className="absolute inset-0 mx-auto flex max-h-[35rem] max-w-[1920px] flex-col justify-center sm:static"
            fit="cover"
          />

          {showProfileImage ? (
            <div className="container absolute bottom-0 left-0 right-0 top-0 mx-auto flex justify-center px-5 md:block">
              <a
                onClick={() => setIsImageLightboxOpen(true)}
                className="absolute bottom-[-4.5rem] block h-32 w-32 cursor-pointer overflow-hidden rounded-full border-4 border-page-background bg-background sm:h-40 sm:w-40 md:bottom-[-7.5rem] md:h-60 md:w-60"
              >
                <Image
                  fileId={owner?.profileImageFileId}
                  fileKey={owner?.profileImageFileKey}
                  targetDrive={targetDrive}
                  previewThumbnail={owner?.profileImagePreviewThumbnail}
                  lastModified={owner?.profileImageLastModified}
                  className="h-full w-full"
                  fit="cover"
                />
              </a>
            </div>
          ) : null}
        </div>
        {/* min height of 8.5 rem to ensure sufficient spacing after the hero picture to support the offset of the profile picture*/}
        <div className="container mx-auto flex min-h-[8.5rem] px-5 xl:h-[8.5rem]">
          <div className={`my-auto w-full ${showProfileImage ? 'pt-[5rem] md:py-4 md:pl-60' : ''}`}>
            <div className={`flex flex-col ${showProfileImage ? 'md:pl-10' : ''} lg:flex-row`}>
              <div className="text-center md:text-left">
                <h1 className="text-2xl">
                  <OwnerName />
                </h1>
                <small className="block text-base">{owner?.status}</small>
              </div>

              <div className="my-3 flex flex-col justify-center md:my-auto md:ml-auto">
                <div className="hidden md:contents">
                  <Socials className="mt-4 justify-center sm:mt-0 md:ml-auto md:justify-start" />
                </div>

                <div
                  className={`flex flex-row ${
                    !hideLinks ? 'flex-wrap' : ''
                  } -my-1 justify-center md:ml-4 md:mt-3`}
                >
                  <FollowLink className="my-1 mr-3 flex-grow" />
                  <ConnectLink className="my-1 flex-grow" />
                  {!hideLinks && (
                    <div className="my-1">
                      <Links className="ml-1" direction="row" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {isImageLightboxOpen && owner?.profileImageFileKey && owner.profileImageFileId ? (
        <ImageLightbox
          targetDrive={targetDrive}
          fileId={owner.profileImageFileId}
          fileKey={owner.profileImageFileKey}
          lastModified={owner.profileImageLastModified}
          onClose={() => setIsImageLightboxOpen(false)}
        />
      ) : null}
    </>
  );
};

export default ProfileHero;
