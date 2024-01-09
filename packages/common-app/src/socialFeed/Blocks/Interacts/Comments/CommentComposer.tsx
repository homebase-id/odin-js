import { ReactionContext } from '@youfoundation/js-lib/public';
import { useMemo, useState } from 'react';
import {
  ActionButton,
  ActionButtonState,
  AuthorImage,
  CanReactInfo,
  CantReactInfo,
  EmojiSelector,
  FileOverview,
  FileSelector,
  ImageIcon,
  Loader,
  PaperPlane,
  VolatileInput,
  getImagesFromPasteEvent,
  t,
  useDotYouClient,
  useReaction,
} from '@youfoundation/common-app';

import { ErrorNotification } from '@youfoundation/common-app';

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
  const { getIdentity } = useDotYouClient();
  const {
    mutateAsync: postComment,
    error: postCommentError,
    status: postState,
  } = useReaction().saveComment;

  const [bodyAfterError, setBodyAfterError] = useState<string | undefined>();
  const [attachementAfterError, setAttachementAfterError] = useState<File | undefined>();

  const odinId = getIdentity() || '';
  const doPost = async (commentBody: string, attachment?: File) => {
    if (postState === 'pending') return;

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
        <CantReactInfo cantReact={canReact} login={login} />
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
    <div className="ml-2 flex-grow rounded-lg bg-gray-500 bg-opacity-10 px-2 py-1 dark:bg-gray-300 dark:bg-opacity-10">
      <div className={`flex ${hasContent ? 'flex-col' : 'flex-row'}`}>
        <VolatileInput
          defaultValue={body}
          onSubmit={(val) => doPost(val || body, attachment)}
          placeholder={t('Write your comment')}
          onPaste={(e) => {
            const imageFiles = getImagesFromPasteEvent(e);

            if (imageFiles.length) {
              setAttachment(imageFiles[0]);
              e.preventDefault();
            }
          }}
          onChange={(val) => setBody(val)}
        />
        <FileOverview
          files={files}
          setFiles={(newFiles) => setAttachment(newFiles?.[0]?.file as File)}
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
            className="text-foreground text-opacity-30 hover:text-opacity-100"
          >
            <ImageIcon className="h-5 w-5" />
          </FileSelector>
          {hasContent ? (
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
              <ActionButton
                type="mute"
                size="none"
                className={`text-primary transition-opacity px-1 py-1 hover:bg-foreground/10 `}
                onClick={() => doPost(body, attachment)}
              >
                {postState === 'loading' ? (
                  <Loader className="h-4 w-4" />
                ) : (
                  <PaperPlane className="h-4 w-4" />
                )}
              </ActionButton>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
