import { NewMediaFile } from '@homebase-id/js-lib/core';
import { ReactionContext } from '@homebase-id/js-lib/public';
import { useMemo, useState } from 'react';
import {
  VolatileInput,
  FileOverview,
  FileSelector,
  AllContactMentionDropdown,
} from '../../../../form';
import { t, getImagesFromPasteEvent } from '../../../../helpers';
import { CanReactInfo, useOdinClientContext, useReaction } from '../../../../hooks';
import { ErrorNotification, ActionButtonState, ActionButton } from '../../../../ui';
import { AuthorImage } from '../../Author/AuthorImage';
import { CantReactInfo } from '../CantReactInfo';
import { EmojiSelector } from '../EmojiPicker/EmojiSelector';
import { ImageIcon, Loader, PaperPlane } from '../../../../ui/Icons';

const TEN_MEGA_BYTES = 10 * 1024 * 1024;

export const CommentComposer = ({
  context,
  replyThreadId,
  canReact,
  onPost,
  login,
}: {
  context: ReactionContext;
  replyThreadId?: string;
  canReact?: CanReactInfo;
  onPost?: () => void;
  login?: () => void;
}) => {
  const [stateIndex, setStateIndex] = useState(0); // Used to force a re-render of the component, to reset the input

  const loggedInIdentity = useOdinClientContext().getLoggedInIdentity();
  const {
    mutateAsync: postComment,
    error: postCommentError,
    status: postState,
  } = useReaction().saveComment;

  const [bodyAfterError, setBodyAfterError] = useState<string | undefined>();
  const [attachementAfterError, setAttachementAfterError] = useState<File | undefined>();

  const odinId = loggedInIdentity;
  const doPost = async (commentBody: string, attachment?: File) => {
    if (postState === 'pending') return;
    if (commentBody.trim().length === 0 && !attachment) return;

    try {
      await postComment({
        context: {
          ...context,
          target: {
            ...context.target,
            globalTransitId: replyThreadId || context.target.globalTransitId,
          },
        },
        commentData: {
          fileMetadata: {
            appData: {
              content: {
                authorOdinId: odinId,
                body: commentBody,
                attachment,
              },
            },
          },
        },
      });
      setBodyAfterError(undefined);
      setAttachementAfterError(undefined);

      setStateIndex((i) => i + 1);
    } catch (e) {
      console.error('CommentComposer', e);
      setBodyAfterError(commentBody);
      setAttachementAfterError(attachment);
    }

    onPost && onPost();
  };

  return (
    <div className={`${replyThreadId ? 'pl-4' : ''}`}>
      {canReact?.canReact === true || canReact?.canReact === 'comment' ? (
        <div className="text-foreground flex flex-row text-opacity-80">
          <AuthorImage odinId={odinId} size="xs" className="flex-shrink-0" />
          <CommentEditor
            doPost={doPost}
            postState={postState}
            defaultAttachment={attachementAfterError}
            defaultBody={bodyAfterError}
            key={stateIndex}
          />
        </div>
      ) : (
        <CantReactInfo cantReact={canReact} login={login} intent="comment" />
      )}
      <ErrorNotification error={postCommentError} />
    </div>
  );
};

export const CommentEditor = ({
  defaultBody = '',
  defaultAttachment,
  doPost,
  onCancel,
  postState,
}: {
  defaultBody?: string;
  defaultAttachment?: File;
  doPost: (commentBody: string, attachment?: File) => void;
  onCancel?: () => void;
  postState: ActionButtonState;
}) => {
  const [body, setBody] = useState(defaultBody);
  const [attachment, setAttachment] = useState<File | undefined>(defaultAttachment);
  const files = useMemo(() => (attachment ? [{ file: attachment }] : []), [attachment?.size]);
  const hasContent = body?.length || attachment;

  return (
    <div className="ml-2 flex-grow rounded-lg bg-gray-500 bg-opacity-10 px-2 py-1 dark:bg-gray-300 dark:bg-opacity-10 relative">
      <div className={`flex ${hasContent ? 'flex-col' : 'flex-row'}`}>
        <VolatileInput
          defaultValue={body}
          onSubmit={(val) => doPost(val || body, attachment)}
          placeholder={t('Write your comment')}
          className="w-full"
          onPaste={(e) => {
            const imageFiles = getImagesFromPasteEvent(e);

            if (imageFiles.length) {
              setAttachment(imageFiles[0]);
              e.preventDefault();
            }
          }}
          onChange={(val) => setBody(val)}
          autoCompleters={[AllContactMentionDropdown]}
        />
        <FileOverview
          files={files}
          setFiles={(newFiles: NewMediaFile[]) => setAttachment(newFiles?.[0]?.file as File)}
          className="my-2"
          cols={4}
        />
        <div className="flex flex-shrink-0 flex-row items-center">
          <EmojiSelector
            size="none"
            className="text-foreground text-opacity-30 hover:text-opacity-100 px-1 py-1"
            onInput={(val) => setBody((oldVal) => `${oldVal} ${val}`)}
          />
          <FileSelector
            onChange={(newFiles) => setAttachment(newFiles?.[0])}
            className="px-2 py-1 text-foreground text-opacity-30 hover:text-opacity-100"
            maxSize={TEN_MEGA_BYTES}
          >
            <ImageIcon className="h-5 w-5" />
          </FileSelector>

          <div className="flex flex-row ml-auto">
            {onCancel ? (
              <ActionButton
                onClick={onCancel}
                type="mute"
                size="none"
                className="px-1 py-1 mr-2 text-sm hover:underline"
              >
                Cancel
              </ActionButton>
            ) : null}
            {hasContent ? (
              <ActionButton
                type="mute"
                size="none"
                className={`text-primary transition-opacity px-1 py-1 hover:bg-foreground/10 `}
                onClick={() => doPost(body, attachment)}
              >
                {postState === 'loading' ? (
                  <Loader className="h-5 w-5" />
                ) : (
                  <PaperPlane className="h-5 w-5" />
                )}
              </ActionButton>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
