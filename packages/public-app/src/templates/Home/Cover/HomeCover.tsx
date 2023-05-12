import ChannelTeaser from '../Common/ChannelTeaser/ChannelTeaser';
import useSiteData from '../../../hooks/siteData/useSiteData';
import { BuiltInProfiles, ProfileConfig } from '@youfoundation/js-lib';
import Image from '../../../components/Image/Image';
import useChannels from '../../../hooks/blog/useChannels';
import Links from '../../../components/ui/Layout/Links/Links';
import ConnectionTeaser from '../Common/Connections/ConnectionTeaser';
import FollowLink from '../../../components/ConnectionActions/FollowLink/FollowLink';
import ConnectLink from '../../../components/ConnectionActions/ConnectLink/ConnectLink';
import { OwnerName } from '../../../components/Post/Common/Blocks/Author/Name';
import { useActiveConnections } from '@youfoundation/common-app';

const HomeCover = (props: { leadText?: string; templateSettings: unknown }) => {
  const { owner, home } = useSiteData().data ?? {};
  const { data: channels } = useChannels();
  const { data: connections } = useActiveConnections({ pageSize: 10 }).fetch;

  if (!owner) {
    return <></>;
  }

  const targetDrive = {
    alias: BuiltInProfiles.StandardProfileId.toString(),
    type: ProfileConfig.ProfileDriveType.toString(),
  };

  return (
    <>
      <section className="body-font my-auto">
        <div className="container mx-auto">
          <div className="lg:flex">
            <div className="mb-12 lg:w-1/2">
              {owner?.profileImageId && targetDrive ? (
                <Image
                  fileId={owner?.profileImageId}
                  targetDrive={targetDrive}
                  className="w-full max-w-[none] sm:mx-auto md:max-w-[30rem] lg:max-w-[none]"
                />
              ) : null}
            </div>
            <div className="flex h-full flex-col px-5 lg:w-1/2">
              <h1 className="mb-4 text-2xl">
                <OwnerName />
                <br />
                <small>{home?.tagLine ?? ''}</small>
              </h1>
              {props?.leadText && <p>{props.leadText}</p>}
              <div className="mt-4 flex flex-row">
                <FollowLink className="my-1 mr-3" />
                <ConnectLink className="my-1" />
              </div>
              <div className="-mb-4 mt-auto py-12">
                {channels?.map((channel) => {
                  return (
                    <ChannelTeaser
                      key={channel.channelId}
                      channel={channel}
                      className={'w-full py-4'}
                    />
                  );
                })}
                <Links className="justify-center" style="secondary" direction="row" />
              </div>
            </div>
          </div>
          {connections?.pages[0]?.results.length ? (
            <div className="mb-20 mt-16 px-5">
              <div className="-m-3 flex flex-wrap">
                {connections.pages[0]?.results?.map((item, index) => {
                  return (
                    <ConnectionTeaser
                      key={index}
                      odinId={item?.odinId}
                      className="p-2 md:w-1/2 lg:w-1/3"
                    />
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
};

export default HomeCover;
