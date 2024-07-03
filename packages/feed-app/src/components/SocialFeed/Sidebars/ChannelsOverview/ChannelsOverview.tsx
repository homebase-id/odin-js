import {
  t,
  useDotYouClient,
  useChannels,
  useCollaborativeChannels,
  HybridLink,
  Persons,
  Quote,
  LoadingBlock,
} from '@youfoundation/common-app';
import React from 'react';
import { ROOT_PATH } from '../../../../app/App';
import { ApiType, DotYouClient } from '@youfoundation/js-lib/core';

const ChannelsOverview = ({ className }: { className?: string }) => {
  const { getIdentity } = useDotYouClient();
  const identity = getIdentity();
  const { data: channels, isLoading } = useChannels({ isAuthenticated: true, isOwner: true });
  const { data: collaborativeChannels } = useCollaborativeChannels().fetch;

  return (
    <div className={`flex flex-col gap-3 overflow-hidden px-4 py-3 ${className ?? ''}`}>
      <div>
        <h2 className="mb-1 text-foreground">{t('Your channels')}</h2>
        <div className="flex flex-col">
          {isLoading ? (
            <>
              <LoadingBlock className="my-1 h-9 w-full" />
              <LoadingBlock className="my-1 h-9 w-full" />
              <LoadingBlock className="my-1 h-9 w-full" />
            </>
          ) : (
            <>
              {channels?.map((chnl) => (
                <HybridLink
                  key={chnl.fileMetadata.appData.uniqueId}
                  href={`${new DotYouClient({ identity: identity || undefined, api: ApiType.Guest }).getRoot()}/posts/${chnl?.fileMetadata.appData.content.slug}`}
                  className="relative flex w-full flex-row items-center gap-2 bg-background p-1 hover:z-10 hover:bg-gray-100 hover:shadow-md dark:hover:bg-gray-800 hover:dark:shadow-slate-600"
                >
                  <Quote className="h-4 w-4 flex-shrink-0" />
                  {chnl.fileMetadata.appData.content.name}
                </HybridLink>
              ))}
            </>
          )}
        </div>
      </div>

      {collaborativeChannels?.length ? (
        <div>
          <h2 className="mb-1 text-foreground">{t('Collaborative channels')}</h2>
          <div className="flex flex-col">
            {collaborativeChannels?.map((collaborative) => (
              <React.Fragment key={collaborative.odinId}>
                {collaborative.channels.map((chnl) => (
                  <HybridLink
                    key={chnl.fileMetadata.appData.uniqueId}
                    href={`${new DotYouClient({ identity: collaborative.odinId, api: ApiType.Guest }).getRoot()}/posts/${chnl?.fileMetadata.appData.content.slug}?youauth-logon=${identity}`}
                    className="relative flex w-full flex-row items-center gap-2 bg-background p-1 hover:z-10 hover:bg-gray-100 hover:shadow-md dark:hover:bg-gray-800 hover:dark:shadow-slate-600"
                  >
                    <Persons className="h-4 w-4 flex-shrink-0" />
                    <span className="leading-none">
                      {chnl.fileMetadata.appData.content.name}{' '}
                      <span className="text-sm text-slate-400">({collaborative.odinId})</span>
                    </span>
                  </HybridLink>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      ) : null}

      <HybridLink href={`${ROOT_PATH}/channels`} className="text-sm text-slate-400 hover:underline">
        {t('Manage channels')}
      </HybridLink>
    </div>
  );
};

export default ChannelsOverview;
