import { ReactionContext } from '@youfoundation/js-lib/public';
import { useMemo, useState } from 'react';
import {
  ActionButton,
  AuthorImage,
  CanReactInfo,
  CantReactInfo,
  EmojiSelector,
  FileOverview,
  FileSelector,
  ImageIcon,
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
    isLoading,
  } = useReaction().saveComment;

  const [bodyAfterError, setBodyAfterError] = useState<string | undefined>();
  const [attachementAfterError, setAttachementAfterError] = useState<File | undefined>();

  const odinId = getIdentity() || '';
  const doPost = async (commentBody: string, attachment?: File) => {
    if (isLoading) return;
    setStateIndex((i) => i + 1);

    try {
      await postComment({
        authorOdinId: odinId,
        content: { body: commentBody, attachment, hasAttachment: !!attachment },
        context,
        threadId: replyThreadId,
      });
      setBodyAfterError(undefined);
      setAttachementAfterError(undefined);
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
}: {
  defaultBody?: string;
  defaultAttachment?: File;
  doPost: (commentBody: string, attachment?: File) => void;
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
          supportEmojiShortcut={true}
        />
        <FileOverview
          files={files}
          setFiles={(newFiles) => setAttachment(newFiles?.[0]?.file as File)}
          className="my-2"
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
            <ActionButton
              type="mute"
              size="none"
              className={`ml-auto text-primary transition-opacity px-1 py-1`}
              onClick={() => doPost(body, attachment)}
            >
              <PaperPlane className="h-4 w-4" />
            </ActionButton>
          ) : null}
        </div>
      </div>
    </div>
  );
};
