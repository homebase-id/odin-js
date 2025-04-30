import {
  t,
  usePost,
  ChannelOrAclSelector,
  ActionButton,
  useManagePost,
  ErrorNotification,
  useChannel,
  FEED_ROOT_PATH,
} from '@homebase-id/common-app';
import { OpenLock, Lock, Article as ArticleIcon, Clipboard } from '@homebase-id/common-app/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { PageMeta } from '@homebase-id/common-app';
import { useEffect, useState } from 'react';
import { HomebaseFile, NewHomebaseFile } from '@homebase-id/js-lib/core';
import { BlogConfig, ChannelDefinition } from '@homebase-id/js-lib/public';
import { getNewId } from '@homebase-id/js-lib/helpers';

export const ArticleDuplicatePage = () => {
  const { channelKey, postKey } = useParams();
  const { data: channel, isPending: isLoadingServerChannel } = useChannel({
    channelKey,
  }).fetch;
  const { data: postFile, isPending: isLoadingServerPost } = usePost({
    channelKey,
    postKey,
  });
  const {
    mutate: duplicatePost,
    status: duplicatePostStatus,
    error: duplictePostError,
  } = useManagePost().duplicate;
  const [newPostId] = useState(getNewId());

  const [targetChannel, setTargetChannel] = useState<
    HomebaseFile<ChannelDefinition> | NewHomebaseFile<ChannelDefinition>
  >(BlogConfig.PublicChannelNewDsr);
  const [targetGroupId, setTargetGroupId] = useState<string | undefined>(undefined);
  const navigate = useNavigate();

  const doDuplicate = async () => {
    if (!postFile || !channel?.fileMetadata.appData.uniqueId) return;

    duplicatePost({
      newPostId,
      toDuplicatePostFile: postFile,
      channelId: channel?.fileMetadata.appData.uniqueId,
      targetChannel: targetChannel || BlogConfig.PublicChannelNewDsr,
      odinId: targetGroupId,
    });
  };

  useEffect(() => {
    if (duplicatePostStatus === 'success') {
      navigate(
        `${FEED_ROOT_PATH}/edit/${targetChannel.fileMetadata.appData.content.slug}/${newPostId}`
      );
    }
  }, [duplicatePostStatus]);

  if (isLoadingServerChannel || isLoadingServerPost) {
    return null;
  }

  return (
    <>
      <ErrorNotification error={duplictePostError} />
      <PageMeta
        title={
          <div className="flex-col">
            {t('Duplicate')} {postFile?.fileMetadata.appData.content?.caption || t('New article')}
            <small className="text-sm text-gray-400">
              <span className="flex flex-row items-center gap-1">
                {postFile?.fileMetadata.isEncrypted ? (
                  <Lock className="h-3 w-3" />
                ) : (
                  <OpenLock className="h-3 w-3" />
                )}
                {channel?.fileMetadata.appData.content.name || ''}
              </span>
            </small>
          </div>
        }
        browserTitle={postFile?.fileMetadata.appData.content?.caption || t('New article')}
        icon={ArticleIcon}
        breadCrumbs={[
          { title: t('Feed'), href: `${FEED_ROOT_PATH}` },
          { title: t('Articles'), href: `${FEED_ROOT_PATH}/articles` },
          { title: t('Duplicate article') },
        ]}
      />

      <section className="pb-10">
        <div className="sm:px-10">
          <div className="grid grid-flow-row gap-1">
            <span className="text-sm text-gray-400">{t('Channel')}</span>
            <div className="mb-5 flex flex-row items-center gap-2 border-gray-200 border-opacity-60 bg-background p-2 text-foreground dark:border-gray-800 md:rounded-lg md:border md:p-4">
              <ChannelOrAclSelector
                key={postFile?.fileMetadata.appData.content?.channelId}
                className={`w-full rounded border-gray-300 px-3 focus:border-indigo-500 dark:border-gray-700`}
                defaultChannelValue={targetChannel?.fileMetadata.appData.uniqueId}
                onChange={({ channel: newChannel, odinId: targetGroupId }) => {
                  if (!newChannel) return;
                  setTargetChannel(newChannel);
                  setTargetGroupId(targetGroupId);
                }}
                excludeMore={true}
                excludeCustom={true}
                excludeCollaborative={true}
              />
            </div>

            <div className="flex flex-row-reverse gap-2">
              <ActionButton
                className={``}
                icon={Clipboard}
                state={duplicatePostStatus}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  doDuplicate();
                }}
                type="primary"
              >
                {t('Continue')}
              </ActionButton>
              <ActionButton type="secondary" onClick={() => navigate(-1)}>
                {t('Cancel')}
              </ActionButton>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default ArticleDuplicatePage;
