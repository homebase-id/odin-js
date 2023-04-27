import { ReactionContext } from '@youfoundation/js-lib';
import { useState } from 'react';
import { t } from '../../../../../../../helpers/i18n/dictionary';
import { getImagesFromPasteEvent } from '../../../../../../../helpers/pasteHelper';
import useAuth from '../../../../../../../hooks/auth/useAuth';
import { CanReactDetails } from '../../../../../../../hooks/reactions/useCanReact';
import useReaction from '../../../../../../../hooks/reactions/useReaction';
import { FileOverview } from '../../../../../../Form/Files/FileOverview';
import { FileSelector } from '../../../../../../Form/Files/FileSelector';
import VolatileInput from '../../../../../../Form/VolatileInput';
import ErrorNotification from '../../../../../../ui/Alerts/ErrorNotification/ErrorNotification';

import Image from '../../../../../../ui/Icons/RichTextEditorIcons/Image/Image';
import AuthorImage from '../../../Author/Image';
import EmojiSelector from '../../EmojiPicker/EmojiSelector';

const CommentComposer = ({
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
  const { getIdentity, isAuthenticated } = useAuth();
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

  if (!isAuthenticated || !canReactDetails) {
    return null;
  }

  return (
    <div className={`${replyThreadId ? 'pl-4' : ''}`}>
      {canReactDetails === 'ALLOWED' ? (
        <div className="flex flex-row text-foreground text-opacity-80">
          <AuthorImage odinId={odinId} size="xs" className="flex-shrink-0" />
          <CommentEditor
            doPost={doPost}
            defaultAttachment={attachementAfterError}
            defaultBody={bodyAfterError}
            key={stateIndex}
          />
        </div>
      ) : (
        <p className="text-sm italic text-foreground text-opacity-50">
          {canReactDetails === 'NOT_AUTHENTICATED' &&
            t('Reactions are disabled for anonymous users')}
          {canReactDetails === 'NOT_AUTHORIZED' &&
            t('You do not have the necessary access to react on this post')}
          {canReactDetails === 'DISABLED_ON_POST' && t('Reactions are disabled on this post')}
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
        />
        <div className="flex flex-shrink-0 flex-row items-center ">
          <EmojiSelector
            className="text-opacity-30 hover:text-opacity-100"
            onInput={(val) => setBody((oldVal) => `${oldVal} ${val}`)}
          />
          <FileSelector
            onChange={(newFiles) => setAttachment(newFiles?.[0])}
            className="text-foreground text-opacity-30 hover:text-opacity-100"
          >
            <Image className="h-5 w-5" />
          </FileSelector>
        </div>
      </div>
      <FileOverview
        files={attachment ? [attachment] : []}
        setFiles={(newFiles) => setAttachment(newFiles?.[0])}
        className="mt-2"
      />
    </div>
  );
};

export default CommentComposer;
