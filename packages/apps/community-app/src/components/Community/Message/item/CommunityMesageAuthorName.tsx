import { getOdinIdColor, AuthorName } from '@homebase-id/common-app';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import React from 'react';
import { useCommunityCollaborativeMsg } from '../../../../hooks/community/useCommunityCollaborativeMsg';
import { CommunityMessage } from '../../../../providers/CommunityMessageProvider';

export const CommunityMessageAuthorName = ({ msg }: { msg: HomebaseFile<CommunityMessage> }) => {
  const { isCollaborative } = useCommunityCollaborativeMsg({ msg });

  const authorOdinId = msg.fileMetadata.originalAuthor;
  const collaborators = msg.fileMetadata.appData.content.collaborators;

  if (isCollaborative && collaborators?.length) {
    return (
      <p>
        {[...collaborators, msg.fileMetadata.originalAuthor]
          .reverse()
          .map((collaborator, index) => (
            <React.Fragment key={collaborator}>
              <span
                className={`font-semibold`}
                style={{ color: getOdinIdColor(collaborator).darkTheme }}
              >
                {<AuthorName odinId={collaborator} />}
              </span>
              {index < collaborators.length - 1 ? (
                <span>, </span>
              ) : index === collaborators.length - 1 ? (
                <span> & </span>
              ) : null}
            </React.Fragment>
          ))}
      </p>
    );
  }

  return (
    <p className={`font-semibold`} style={{ color: getOdinIdColor(authorOdinId).darkTheme }}>
      {<AuthorName odinId={authorOdinId} />}
    </p>
  );
};
