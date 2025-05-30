import { useMemo, useState } from 'react';
import {
  ChannelDefinitionVm,
  ChannelItem,
  FEED_ROOT_PATH,
  ManageCollaborativeChannelItem,
  useCollaborativeChannels,
} from '@homebase-id/common-app';
import { Loader, MagnifyingGlass, Plus, Quote } from '@homebase-id/common-app/icons';
import { t } from '@homebase-id/common-app';
import { useChannels } from '@homebase-id/common-app';
import { PageMeta } from '@homebase-id/common-app';
import { useSearchParams } from 'react-router-dom';
import { NewHomebaseFile } from '@homebase-id/js-lib/core';
import { tryJsonParse } from '@homebase-id/js-lib/helpers';
import React from 'react';

export const ChannelsPage = () => {
  const [params, setSearchParams] = useSearchParams();

  const newChannelDefinition = useMemo(() => {
    const newQueryParam = params.get('new');
    if (!newQueryParam) return undefined;

    const newChannel = tryJsonParse<NewHomebaseFile<ChannelDefinitionVm>>(newQueryParam);
    return newChannel;
  }, [params]);

  const { data: channels } = useChannels({ isAuthenticated: true, isOwner: true });
  const [isAddNew, setIsAddNew] = useState(!!newChannelDefinition);

  const [discoverCollaborativeChannels, setDiscoverCollaborativeChannels] = useState(false);
  const {
    data: collaborativeChannels,
    refetch: refetchCollaborativeChannels,
    isRefetching: isRefetchingCollaborativeChannels,
  } = useCollaborativeChannels(discoverCollaborativeChannels).fetch;

  return (
    <>
      <PageMeta
        title={t('Channels')}
        icon={Quote}
        breadCrumbs={[{ title: t('Feed'), href: FEED_ROOT_PATH }, { title: t('Channels') }]}
      />
      <section className="pb-10">
        <div className="px-2 sm:px-10">
          <h2 className="mb-2">{t('Your channels')}</h2>
          <div className="flex flex-col gap-2">
            {channels?.map((chnl) => (
              <div key={chnl.fileId}>
                <ChannelItem chnl={chnl} className="bg-background" />
              </div>
            ))}
            {isAddNew ? (
              <div key={'new'}>
                <ChannelItem
                  chnl={newChannelDefinition}
                  isDefaultEdit={!!newChannelDefinition}
                  onClose={() => {
                    setIsAddNew(false);
                    params.delete('new');
                    setSearchParams(params);
                  }}
                  className="bg-background"
                />
              </div>
            ) : (
              <div key={'new'}>
                <div
                  onClick={() => setIsAddNew(true)}
                  className="flex cursor-pointer flex-row items-center rounded-md border border-slate-100 bg-background px-4 py-4 dark:border-slate-800"
                >
                  <Plus className="mr-2 h-5 w-5" /> {t('Add new')}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="pb-10">
        <div className="px-2 sm:px-10">
          <h2 className="mb-2">
            {t('Collaborative channels')}
            <small className="block text-sm text-slate-400">
              {t(
                'You have permissions to write to these channels that are owned by another identity'
              )}
            </small>
          </h2>

          <div className="flex flex-col gap-2">
            {collaborativeChannels?.length ? (
              <>
                {collaborativeChannels?.map((identityLink) => {
                  return (
                    <React.Fragment key={identityLink.odinId}>
                      {identityLink.channels.map((chnlLink, index) => (
                        <ManageCollaborativeChannelItem
                          key={chnlLink.fileMetadata.appData.uniqueId || index}
                          odinId={chnlLink.fileMetadata.appData.content.odinId}
                          chnlLink={chnlLink}
                          className="bg-background"
                        />
                      ))}
                    </React.Fragment>
                  );
                })}
              </>
            ) : null}
            <div
              onClick={() => {
                setDiscoverCollaborativeChannels(true);
                setTimeout(() => refetchCollaborativeChannels(), 100);
              }}
              className="flex cursor-pointer flex-row items-center rounded-md border border-slate-100 bg-background px-4 py-4 dark:border-slate-800"
            >
              {isRefetchingCollaborativeChannels && discoverCollaborativeChannels ? (
                <Loader className="mr-2 h-5 w-5" />
              ) : (
                <MagnifyingGlass className="mr-2 h-5 w-5" />
              )}{' '}
              {t(`Discover collaborative channels`)}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default ChannelsPage;
