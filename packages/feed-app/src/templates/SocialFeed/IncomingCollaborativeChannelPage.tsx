import {
  ActionButton,
  CollaborativeChannelItem,
  Quote,
  Save,
  useCollaborativeChannel,
} from '@youfoundation/common-app';
import { t } from '@youfoundation/common-app';
import { PageMeta } from '../../components/ui/PageMeta/PageMeta';
import { ROOT_PATH } from '../../app/App';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { tryJsonParse } from '@youfoundation/js-lib/helpers';
import { RemoteCollaborativeChannelDefinition } from '@youfoundation/js-lib/public';
import { NewHomebaseFile, SecurityGroupType } from '@youfoundation/js-lib/core';
import { useEffect } from 'react';

export const IncomingCollaborativeChannelPage = () => {
  const [params] = useSearchParams();
  const channelParam = params.get('channel');

  const incomingChannel =
    channelParam && tryJsonParse<RemoteCollaborativeChannelDefinition>(channelParam);

  const { mutate: saveCollaborativeChannel, status: saveStatus } = useCollaborativeChannel().save;

  const navigate = useNavigate();
  useEffect(() => {
    if (saveStatus === 'success') {
      navigate(`${ROOT_PATH}/channels`);
    }
  }, [saveStatus]);

  if (!incomingChannel) return null;
  const doSave = () => {
    const newChannel: NewHomebaseFile<RemoteCollaborativeChannelDefinition> = {
      fileMetadata: {
        appData: {
          content: incomingChannel,
        },
      },
      serverMetadata: {
        accessControlList: { requiredSecurityGroup: SecurityGroupType.Owner },
      },
    };

    saveCollaborativeChannel(newChannel);
  };

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
        <div className="px-2 sm:px-10">
          <div className="mb-4 max-w-xl">
            <h2 className="text-xl">{t('Save group channel?')}</h2>
            <p className="text-slate-400">
              {t(
                'By saving, you add a link to the collaborative channel to your feed-app. This allows easy access to post to this channel from your feed-app.'
              )}
            </p>
          </div>
          <CollaborativeChannelItem
            odinId={incomingChannel.odinId}
            chnl={incomingChannel}
            className="bg-background"
          />
          <div className="mt-4 flex flex-row-reverse gap-2">
            <ActionButton icon={Save} onClick={doSave} state={saveStatus}>
              {t('Save')}
            </ActionButton>
            <ActionButton type="secondary" onClick={() => window.history.back()}>
              {t('Cancel')}
            </ActionButton>
          </div>
        </div>
      </section>
    </>
  );
};

export default IncomingCollaborativeChannelPage;
