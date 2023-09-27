import { ReactionContext } from '@youfoundation/js-lib/public';
import { useState } from 'react';
import {
  AuthorImage,
  CanReactDetails,
  EmojiSelector,
  FileOverview,
  FileSelector,
  ImageIcon,
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
  canReactDetails,
  onPost,
}: {
  context: ReactionContext;
  replyThreadId?: string;
  canReactDetails: CanReactDetails;
  onPost?: () => void;
}) => {
  const [stateIndex, setStateIndex] = useState(0); // Used to force a re-render of the component, to reset the input
  const { getIdentity } = useDotYouClient();
  const { mutateAsync: postComment, error: postCommentError } = useReaction().saveComment;

  const [bodyAfterError, setBodyAfterError] = useState<string | undefined>();
  const [attachementAfterError, setAttachementAfterError] = useState<File | undefined>();

  const odinId = getIdentity() || '';
  const doPost = async (commentBody: string, attachment?: File) => {
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
      {canReactDetails === 'ALLOWED' ? (
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
        <p className="text-foreground text-sm italic text-opacity-50">
          {canReactDetails === 'NOT_AUTHENTICATED' &&
            t('Reactions are disabled for anonymous users')}
          {canReactDetails === 'NOT_AUTHORIZED' &&
            t('You do not have the necessary access to react on this post')}
          {canReactDetails === 'DISABLED_ON_POST' && t('Reactions are disabled on this post')}
          {!canReactDetails && t('We could not determine if you can react on this post')}
        </p>
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

  return (
    <div className="ml-2 flex-grow rounded-lg bg-gray-500 bg-opacity-10 px-2 py-1 dark:bg-gray-300 dark:bg-opacity-10">
      <div className="flex flex-row">
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
        <div className="flex flex-shrink-0 flex-row items-center ">
          <EmojiSelector
            size="small"
            className="text-foreground text-opacity-30 hover:text-opacity-100"
            onInput={(val) => setBody((oldVal) => `${oldVal} ${val}`)}
          />
          <FileSelector
            onChange={(newFiles) => setAttachment(newFiles?.[0])}
            className="text-foreground text-opacity-30 hover:text-opacity-100"
          >
            <ImageIcon className="h-5 w-5" />
          </FileSelector>
        </div>
      </div>
      <FileOverview
        files={attachment ? [{ file: attachment }] : []}
        setFiles={(newFiles) => setAttachment(newFiles?.[0].file as File)}
        className="mt-2"
      />
    </div>
  );
};
