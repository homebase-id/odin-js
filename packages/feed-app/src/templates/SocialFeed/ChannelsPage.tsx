import { useMemo, useState } from 'react';
import { ChannelDefinitionVm, ChannelItem, Plus } from '@youfoundation/common-app';
import { Quote } from '@youfoundation/common-app';
import { t } from '@youfoundation/common-app';
import { useChannels } from '@youfoundation/common-app';
import { PageMeta } from '../../components/ui/PageMeta/PageMeta';
import { ROOT_PATH } from '../../app/App';
import { useSearchParams } from 'react-router-dom';
import { NewDriveSearchResult } from '@youfoundation/js-lib/core';
import { tryJsonParse } from '@youfoundation/js-lib/helpers';

export const ChannelsPage = () => {
  const [params, setSearchParams] = useSearchParams();

  const newChannelDefinition = useMemo(() => {
    const newQueryParam = params.get('new');
    if (!newQueryParam) return undefined;

    const newChannel = tryJsonParse<NewDriveSearchResult<ChannelDefinitionVm>>(newQueryParam);
    return newChannel;
  }, [params]);

  const { data: channels } = useChannels({ isAuthenticated: true, isOwner: true });
  const [isAddNew, setIsAddNew] = useState(!!newChannelDefinition);

  return (
    <>
      <PageMeta
        title={t('Channels')}
        icon={Quote}
        breadCrumbs={[{ title: t('Feed'), href: ROOT_PATH }, { title: t('Channels') }]}
      />
      <section className="pb-10">
        <div className="px-2 sm:px-10">
          <div className="-m-2">
            {channels?.map((chnl) => (
              <div className="p-2" key={chnl.fileId}>
                <ChannelItem chnl={chnl} className="bg-background" />
              </div>
            ))}
            {isAddNew ? (
              <div className="p-2" key={'new'}>
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
              <div className="p-2" key={'new'}>
                <div
                  onClick={() => setIsAddNew(true)}
                  className="flex cursor-pointer flex-row items-center rounded-md border border-slate-100 bg-background px-4 py-4 dark:border-slate-800"
                >
                  <Plus className="mr-2 h-4 w-4" /> {t('Add new')}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
};

export default ChannelsPage;
