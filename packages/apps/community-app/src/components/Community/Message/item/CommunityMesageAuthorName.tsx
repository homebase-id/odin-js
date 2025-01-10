import { getOdinIdColor, AuthorName } from '@homebase-id/common-app';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { useCommunityCollaborativeMsg } from '../../../../hooks/community/useCommunityCollaborativeMsg';
import { CommunityMessage } from '../../../../providers/CommunityMessageProvider';
import { ParticipantsList } from '../../participants/ParticipantsList';

export const CommunityMessageAuthorName = ({ msg }: { msg: HomebaseFile<CommunityMessage> }) => {
  const { isCollaborative } = useCommunityCollaborativeMsg({ msg });

  const authorOdinId = msg.fileMetadata.originalAuthor;
  const collaborators = msg.fileMetadata.appData.content.collaborators;

  if (isCollaborative && collaborators?.length) {
    return (
      <p>
        <ParticipantsList
          participants={[...collaborators, msg.fileMetadata.originalAuthor].reverse()}
          isShowColor={true}
          participantClassName="font-semibold"
        />
      </p>
    );
  }

  return (
    <p className={`font-semibold`} style={{ color: getOdinIdColor(authorOdinId).darkTheme }}>
      {<AuthorName odinId={authorOdinId} />}
    </p>
  );
};
