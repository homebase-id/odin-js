import {
  GetTargetDriveFromChannelId,
  ReactionContent,
  ReactionContext,
} from '@youfoundation/js-lib/public';
import { RichTextRenderer } from '../../../../../richText';
import { CommentEditor } from '../CommentComposer';
import { CommentMedia } from './CommentMedia';

export const CommentBody = ({
  context,
  commentFileId,
  content,
  isEdit,
  onUpdate,
}: {
  context?: ReactionContext;
  commentFileId?: string;
  content: ReactionContent;
  isEdit?: boolean;
  onUpdate?: (commentBody: string, attachment?: File) => void;
}) => {
  const { body, bodyAsRichText } = content;
  const sourceTargetDrive = context && GetTargetDriveFromChannelId(context.channelId);

  return (
    <>
      {isEdit && onUpdate ? (
        <CommentEditor defaultBody={body} doPost={onUpdate} />
      ) : (
        <>
          {bodyAsRichText ? (
            <RichTextRenderer body={bodyAsRichText} />
          ) : (
            <p className="whitespace-pre-wrap">{body}</p>
          )}
          {content.hasAttachment && context ? (
            <CommentMedia
              postAuthorOdinId={context.authorOdinId}
              targetDrive={sourceTargetDrive}
              fileId={commentFileId}
            />
          ) : null}
        </>
      )}
    </>
  );
};
