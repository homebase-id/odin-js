import ChannelTeaser from '../Common/ChannelTeaser/ChannelTeaser';
import { BuiltInProfiles, ProfileConfig } from '@homebase-id/js-lib/profile';
import {
  OwnerName,
  Image,
  useChannels,
  useSiteData,
  ThemeCoverSettings,
  RichTextRenderer,
  useOdinClientContext,
} from '@homebase-id/common-app';
import Links from '../../../components/ui/Layout/Links/Links';
import FollowLink from '../../../components/ConnectionActions/FollowLink/FollowLink';
import ConnectLink from '../../../components/ConnectionActions/ConnectLink/ConnectLink';

const HomeCover = ({ templateSettings }: { templateSettings?: ThemeCoverSettings }) => {
  const { owner } = useSiteData().data ?? {};
  const odinClient = useOdinClientContext();
  const isOwner = odinClient.isOwner();
  const isAuthenticated = odinClient.isAuthenticated();
  const { data: channels } = useChannels({ isAuthenticated, isOwner });
  if (!owner) return null;

  const targetDrive = {
    alias: BuiltInProfiles.StandardProfileId.toString(),
    type: ProfileConfig.ProfileDriveType.toString(),
  };

  return (
    <section className="body-font my-auto">
      <div className="container mx-auto px-5 py-5">
        <div className="flex flex-col lg:flex-row lg:gap-5">
          <div className="mx-auto mb-12 min-w-[15rem] md:max-w-[30rem] lg:w-1/2 lg:max-w-[35rem]">
            {owner?.profileImageFileId && owner?.profileImageFileKey && targetDrive ? (
              <Image
                fileId={owner.profileImageFileId}
                fileKey={owner.profileImageFileKey}
                previewThumbnail={owner?.profileImagePreviewThumbnail}
                lastModified={owner?.profileImageLastModified}
                targetDrive={targetDrive}
                className="w-full"
              />
            ) : null}
          </div>
          <div className="flex h-full flex-grow flex-col lg:w-1/2">
            <h1 className="mb-4 text-2xl">
              <OwnerName />
              <br />
              <small>{templateSettings?.tagLine ?? ''}</small>
            </h1>
            {templateSettings?.leadText ? (
              <RichTextRenderer body={templateSettings?.leadText} />
            ) : null}
            <div className="mt-4 flex flex-row">
              <FollowLink className="my-1 mr-3" />
              <ConnectLink className="my-1" />
            </div>
            <div className="-mb-4 mt-auto py-12">
              {channels?.map((channel) => {
                return (
                  <ChannelTeaser key={channel.fileId} channel={channel} className={'w-full py-4'} />
                );
              })}
              <Links className="justify-center" style="secondary" direction="row" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeCover;
