import { useState } from 'react';
import { ChannelItem, Plus } from '@youfoundation/common-app';
import { Quote } from '@youfoundation/common-app';
import { t } from '@youfoundation/common-app';
import { useChannels } from '@youfoundation/common-app';
import { PageMeta } from '../../components/ui/PageMeta/PageMeta';

const ChannelsPage = () => {
  const { data: channels } = useChannels({ isAuthenticated: true, isOwner: true });
  const [isAddNew, setIsAddNew] = useState(false);

  return (
    <>
      <PageMeta title={t('Channels')} icon={Quote} />
      <section className="pb-10">
        <div className="px-2 sm:px-10">
          <div className="-m-2">
            {channels?.map((chnl) => (
              <div className="p-2" key={chnl.channelId}>
                <ChannelItem chnl={chnl} className="bg-background" />
              </div>
            ))}
            {isAddNew ? (
              <div className="p-2" key={'new'}>
                <ChannelItem onClose={() => setIsAddNew(false)} className="bg-background" />
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
