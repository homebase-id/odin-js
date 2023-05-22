import {
  BlogConfig,
  ChannelDefinition,
  PostContent,
  PostFile,
  SecurityGroupType,
  Article,
  getChannelDrive,
  ImageUploadResult,
  getNewId,
  RichText,
} from '@youfoundation/js-lib';
import { useEffect, useMemo, useState } from 'react';
import { RichTextEditor, Trash, getReadingTime, t } from '@youfoundation/common-app';

import { ActionButton, ErrorBoundary } from '@youfoundation/common-app';
import { ChannelSelector } from '../PostComposer';
import { convertTextToSlug } from '@youfoundation/common-app';
import { ErrorNotification } from '@youfoundation/common-app';
import { Arrow } from '@youfoundation/common-app';
import DraftsDialog from '../DraftsDialog/DraftsDialog';
import { debounce } from 'lodash-es';
import { useNavigate } from 'react-router-dom';

import { Select } from '@youfoundation/common-app';
import { Label } from '@youfoundation/common-app';
import usePost from '../../../hooks/posts/usePost';
import ImageSelector from '@youfoundation/common-app/src/form/image/ImageSelector';

export const EMPTY_POST: Article = {
  id: '',
  channelId: BlogConfig.PublicChannel.channelId,
  slug: '',
  dateUnixTime: 0,
  type: 'Article',
  caption: '',
  body: '',
  abstract: '',
};

const ArticleComposer = ({
  postFile: externalPostFile,
  channel: externalChannel,
}: {
  postFile?: PostFile<PostContent>;
  channel?: ChannelDefinition;
}) => {
  const navigate = useNavigate();
  const [isDraftsOpen, setIsDraftsOpen] = useState(false);
  const {
    save: { mutateAsync: savePost, error: savePostError, status: savePostStatus },
    remove: {
      mutateAsync: removePost,
      error: removePostError,
      status: removePostStatus,
      reset: resetRemovePostStatus,
    },
  } = usePost();

  const [postFile, setPostFile] = useState<PostFile<Article>>({
    ...externalPostFile,
    content: {
      ...EMPTY_POST,
      id: getNewId(),
      ...externalPostFile?.content,
      type: 'Article',
    },
  });
  const [channel, setChannel] = useState<ChannelDefinition>(
    postFile.content.channelId === externalChannel?.channelId
      ? externalChannel
      : BlogConfig.PublicChannel
  );

  useEffect(() => {
    if (externalPostFile && (!postFile.fileId || savePostStatus === 'success')) {
      setPostFile({
        ...externalPostFile,
        content: {
          ...EMPTY_POST,
          ...externalPostFile?.content,
          type: 'Article',
        },
      });
    }
  }, [externalPostFile]);

  const isFullyEmpty = (postFile: PostFile<Article>) => {
    return (
      !postFile.content.caption?.length &&
      postFile.content.caption.length <= 1 &&
      !postFile.content.abstract?.length &&
      postFile.content.abstract.length <= 1 &&
      !postFile.content.body?.length &&
      postFile.content.body.length === 0 &&
      !postFile.content.primaryMediaFile
    );
  };

  const isAlreadyPublished =
    externalPostFile?.acl &&
    externalPostFile?.acl?.requiredSecurityGroup !== SecurityGroupType.Owner;

  const doSave = async (
    dirtyPostFile: PostFile<Article> = postFile,
    isPublish = false,
    explicitTargetChannel?: ChannelDefinition
  ) => {
    // Check if fully empty and if so don't save
    if (isFullyEmpty(dirtyPostFile)) {
      return;
    }

    const targetChannel = explicitTargetChannel || channel;

    // Build postFile
    const toPostFile: PostFile<Article> = {
      ...dirtyPostFile,
      versionTag: undefined, // VersionTag is set undefined so we always reset it to the latest
      content: {
        ...dirtyPostFile.content,
        dateUnixTime: new Date().getTime(), // Set current date as userDate of the post
        id: dirtyPostFile.content.id ?? getNewId(), // Generate new id if there is none
        slug: convertTextToSlug(dirtyPostFile.content.caption), // Reset slug to match caption each time
        channelId: targetChannel.channelId, // Always update channel to the one in state, shouldn't have changed
        readingTimeStats: getReadingTime(dirtyPostFile.content.body),
      },
      acl:
        targetChannel.acl && (isPublish || isAlreadyPublished)
          ? { ...targetChannel.acl }
          : { requiredSecurityGroup: SecurityGroupType.Owner },
    };

    // Save and process result
    const savedFileId = await savePost({
      blogFile: toPostFile,
      channelId: targetChannel.channelId,
    });

    if (isPublish) {
      window.location.href = `/home/posts/${targetChannel.slug}/${toPostFile.content.slug}`;
    } else {
      // Update url to support proper back browsing; And not losing the context when a refresh is needed
      window.history.replaceState(
        null,
        toPostFile.content.caption,
        `/owner/feed/edit/${targetChannel.slug}/${toPostFile.content.id}`
      );
    }

    if (savedFileId && !dirtyPostFile.fileId) {
      setPostFile((oldPostFile) => {
        return { ...oldPostFile, fileId: savedFileId };
      });
    }
  };

  const doRemovePost = async () => {
    if (!postFile.fileId) {
      return;
    }
    await removePost({
      fileId: postFile.fileId,
      channelId: postFile.content.channelId,
      slug: postFile.content.slug,
    });
  };

  const movePost = async (newChannelDefinition: ChannelDefinition) => {
    setChannel(newChannelDefinition);

    // Clear fileId and contentId (as they can clash with what exists, or cause a fail to overwrite during upload)
    const dataToMove = {
      ...postFile,
      fileId: undefined,
      content: { ...postFile.content, id: getNewId() },
    };

    // Files needs to get removed and saved again
    await doRemovePost();
    resetRemovePostStatus();

    // setTimeout(()=>{
    doSave(dataToMove, false, newChannelDefinition);
    // },2000)
  };

  const PostButton = ({ className }: { className?: string }) => {
    return (
      <ActionButton
        className={`m-2 md:w-auto ${
          isFullyEmpty(postFile) || !postFile.content.caption || !postFile.content.caption.length
            ? 'pointer-events-none opacity-20 grayscale'
            : ''
        } ${className ?? ''}`}
        icon={Arrow}
        state={savePostStatus}
        onClick={() => doSave(postFile, true)}
        confirmOptions={{
          title: t('Post'),
          body: t('Are you sure you want to publish this post?'),
          buttonText: t('Publish'),
        }}
      >
        {t('Post')}
      </ActionButton>
    );
  };

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          doSave();
          return false;
        }}
      >
        <div className="mb-5 flex flex-row flex-wrap items-center bg-background md:flex-nowrap">
          {postFile.fileId && !isAlreadyPublished ? (
            <ActionButton
              type="remove"
              icon={Trash}
              onClick={() => {
                doRemovePost();
                navigate('/owner/feed/articles');
              }}
              confirmOptions={{
                title: t('Discard draft'),
                body: `${t('Are you sure you want to discard')} "${
                  postFile.content.caption || t('Untitled')
                }"`,
                buttonText: t('Discard'),
              }}
              size="square"
              state={removePostStatus}
              className="m-2"
            />
          ) : null}
          <ChannelSelector
            className={`m-2 ml-auto ${
              isAlreadyPublished ? 'pointer-events-none opacity-50' : '' // Once a fileId is existent, the file is stored to this channel drive
            }`}
            defaultValue={postFile.content?.channelId}
            onChange={(channel) => {
              if (postFile.fileId && channel) movePost(channel);
              else if (channel) setChannel(channel);
            }}
          />
          <a
            className="m-2 hidden cursor-pointer flex-row items-center md:flex"
            onClick={() => setIsDraftsOpen(!isDraftsOpen)}
          >
            {t('All Drafts')} <Arrow className="ml-1 h-4 w-4 -rotate-45" />
          </a>
          <PostButton />
        </div>

        <div className="mb-5 border-gray-200 border-opacity-60 bg-background p-2 dark:border-gray-800 md:rounded-lg md:border md:p-4">
          <InnerFieldEditors
            key={postFile.content.id}
            postFile={postFile}
            channel={channel}
            onChange={(e) => {
              const dirtyPostFile = { ...postFile };
              if (e.target.name === 'abstract') {
                dirtyPostFile.content.abstract = (e.target.value as string).trim();
              } else if (e.target.name === 'caption') {
                dirtyPostFile.content.caption = (e.target.value as string).trim();
              } else if (e.target.name === 'primaryImageFileId') {
                const uploadResult = e.target.value as ImageUploadResult;
                dirtyPostFile.content.primaryMediaFile = {
                  fileId: uploadResult.fileId,
                  type: 'image',
                };
                dirtyPostFile.previewThumbnail = uploadResult.previewThumbnail;
              } else if (e.target.name === 'body') {
                dirtyPostFile.content.body = e.target.value as RichText;
              } else if (e.target.name === 'reactAccess') {
                const newReactAccess = e.target.value as SecurityGroupType;
                dirtyPostFile.content.reactAccess =
                  newReactAccess === SecurityGroupType.Owner ? SecurityGroupType.Owner : undefined;
              }

              setPostFile(dirtyPostFile);
              doSave(dirtyPostFile);
            }}
          />

          <div className="mb-5 flex md:hidden">
            <PostButton className="w-full justify-center" />
          </div>
        </div>
      </form>
      <ErrorNotification error={savePostError || removePostError} />
      {isDraftsOpen ? (
        <DraftsDialog isOpen={isDraftsOpen} onCancel={() => setIsDraftsOpen(false)} />
      ) : null}
    </>
  );
};

const InnerFieldEditors = ({
  postFile,
  channel,
  onChange,
}: {
  postFile: PostFile<Article>;
  channel: ChannelDefinition;
  onChange: (e: { target: { name: string; value: string | ImageUploadResult | RichText } }) => void;
}) => {
  const debouncedChange = useMemo(() => debounce(onChange, 1500), [onChange]);

  const body: RichText = Array.isArray((postFile.content as Article)?.body)
    ? ((postFile.content as Article)?.body as RichText)
    : [
        {
          type: 'paragraph',
          children: [{ text: (postFile.content as Article)?.body ?? '' }] as Record<
            string,
            unknown
          >[],
        },
      ];
  return (
    <>
      <div className="grid grid-flow-row gap-1">
        <div className="m-2">
          <input
            id="caption"
            name="caption"
            defaultValue={postFile.content.caption}
            onChange={debouncedChange}
            placeholder={t('Title')}
            className={`-mx-2 w-full resize-none rounded-md bg-transparent p-2 text-lg`}
          />
        </div>
        <div className="m-2">
          <textarea
            id="abstract"
            name="abstract"
            defaultValue={(postFile.content as Article).abstract}
            onChange={debouncedChange}
            placeholder={t('Summary')}
            className={`-mx-2 w-full resize-none rounded-md bg-transparent p-2`}
          />
        </div>
        <div className="m-2">
          <ImageSelector
            id="post_image"
            name="primaryImageFileId"
            defaultValue={postFile.content.primaryMediaFile?.fileId}
            onChange={(e) =>
              e.target.value &&
              onChange(e as { target: { name: string; value: ImageUploadResult } })
            }
            targetDrive={getChannelDrive(channel.channelId)}
            acl={
              channel.acl
                ? { ...channel.acl }
                : { requiredSecurityGroup: SecurityGroupType.Anonymous }
            }
            sizeClass={`${
              !postFile.content.primaryMediaFile ? 'aspect-[16/9] md:aspect-[5/1]' : ''
            }  w-full object-cover`}
            label={t('No primary image selected')}
          />
        </div>
        <div className="mt-4 border-t px-2 pt-4">
          <Label>{t('Reactions')}</Label>
          <Select
            id="reactAccess"
            name="reactAccess"
            defaultValue={postFile.content.reactAccess ?? SecurityGroupType.Connected}
            onChange={(e) => onChange(e)}
          >
            <option>{t('Make a selection')}</option>
            {/* <option value={SecurityGroupType.Authenticated}>{t('Authenticated')}</option> */}
            <option value={SecurityGroupType.Connected}>{t('Enabled')}</option>
            <option value={SecurityGroupType.Owner}>{t('Disabled')}</option>
          </Select>
        </div>
        <div className="m-2 mt-5">
          <ErrorBoundary>
            <RichTextEditor
              defaultValue={body}
              placeholder={t('Start writing...')}
              mediaDrive={getChannelDrive(channel.channelId)}
              name="body"
              onChange={debouncedChange}
              className="min-h-[50vh]"
            />
          </ErrorBoundary>
        </div>
      </div>
    </>
  );
};

export default ArticleComposer;
