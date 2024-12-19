import { AuthorImage } from '@homebase-id/common-app';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { useCommunityCollaborativeMsg } from '../../../../hooks/community/useCommunityCollaborativeMsg';
import { CommunityMessage } from '../../../../providers/CommunityMessageProvider';

export const CommunityMessageAvatar = ({ msg }: { msg: HomebaseFile<CommunityMessage> }) => {
  const { isCollaborative } = useCommunityCollaborativeMsg({ msg });

  const authorOdinId = msg.fileMetadata.originalAuthor;
  const collaborators = msg.fileMetadata.appData.content.collaborators;

  if (isCollaborative && collaborators?.length) {
    return (
      <div className="relative max-h-12 w-8">
        {[...collaborators, msg.fileMetadata.originalAuthor]
          .reverse()
          .slice(0, 4)
          .map((collaborator, index) => (
            <span
              key={collaborator}
              className={index !== 0 ? 'absolute' : ''}
              style={{ left: index % 2 ? 8 : 0, top: index * 8 }}
            >
              <AuthorImage odinId={collaborator} size="xxs" />
            </span>
          ))}
      </div>
    );
  }

  return (
    <AuthorImage
      odinId={authorOdinId}
      className="flex-shrink-0 border border-neutral-200 dark:border-neutral-800"
      size="xs"
    />
  );
};
