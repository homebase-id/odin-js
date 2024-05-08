import { Quote } from '@youfoundation/common-app';
import { t } from '@youfoundation/common-app';
import { PageMeta } from '../../components/ui/PageMeta/PageMeta';
import { ROOT_PATH } from '../../app/App';
import { useSearchParams } from 'react-router-dom';
import { tryJsonParse } from '@youfoundation/js-lib/helpers';
import { RemoteCollaborativeChannelDefinition } from '@youfoundation/js-lib/public';

export const IncomingCollaborativeChannelPage = () => {
  const [params] = useSearchParams();
  const channelParam = params.get('channel');

  const incomingChannel =
    channelParam && tryJsonParse<RemoteCollaborativeChannelDefinition>(channelParam);

  console.log('incomingChannel', incomingChannel);

  return (
    <>
      <PageMeta
        title={t('Incoming Collaborative Channel')}
        icon={Quote}
        breadCrumbs={[
          { title: t('Feed'), href: ROOT_PATH },
          { title: t('Channels'), href: `${ROOT_PATH}/channels` },
          { title: t('Incoming collaborative channel') },
        ]}
      />
      <section className="pb-10">
        <div className="px-2 sm:px-10"></div>
      </section>
    </>
  );
};

export default IncomingCollaborativeChannelPage;
