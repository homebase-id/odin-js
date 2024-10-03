import {
  GetTargetDriveFromChannelId,
  RawReactionContent,
  ReactionContext,
} from '@homebase-id/js-lib/public';
import { RichTextRenderer } from '../../../../../richText';
import { CommentEditor } from '../CommentComposer';
import { CommentMedia, CommentMediaPreview } from './CommentMedia';
import { ActionButtonState } from '../../../../../ui';
import { EmbeddedThumb, ReactionFile } from '@homebase-id/js-lib/core';

export const CommentBody = ({
  context,
  commentFileId,
  commentLastModifed,
  content,
  isEdit,
  onUpdate,
  onCancel,
  updateState,
  previewThumbnail,
}: {
  context?: ReactionContext;
  commentFileId?: string;
  commentLastModifed?: number;
  content: RawReactionContent | ReactionFile;
  isEdit?: boolean;
  onUpdate?: (commentBody: string, attachment?: File) => void;
  onCancel?: () => void;
  updateState: ActionButtonState;
  previewThumbnail?: EmbeddedThumb;
}) => {
  const { body, bodyAsRichText } = content;
  const sourceTargetDrive = context && GetTargetDriveFromChannelId(context.channelId);

  return (
    <>
      {isEdit && onUpdate ? (
        <CommentEditor
          defaultBody={body}
          doPost={onUpdate}
          onCancel={onCancel}
          postState={updateState}
        />
      ) : (
        <>
          {bodyAsRichText ? (
            <RichTextRenderer body={bodyAsRichText} />
          ) : (
            <p className="whitespace-pre-wrap">{body}</p>
          )}
          {content.mediaPayloadKey && context ? (
            <CommentMedia
              postAuthorOdinId={context.odinId}
              targetDrive={sourceTargetDrive}
              fileId={commentFileId}
              fileKey={content.mediaPayloadKey}
              lastModified={commentLastModifed}
              previewThumbnail={previewThumbnail}
            />
          ) : (content as RawReactionContent)?.attachment ? (
            <CommentMediaPreview attachment={(content as RawReactionContent)?.attachment} />
          ) : null}
        </>
      )}
    </>
  );
};
