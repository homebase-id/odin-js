import { AuthorName, getOdinIdColor } from '@homebase-id/common-app';
import React from 'react';

export const ParticipantsList = ({
  participants,
  participantClassName,
  isShowColor,
}: {
  participants: string[] | undefined | null;
  participantClassName?: string;
  isShowColor?: boolean;
}) => {
  if (!participants || !participants.length) return null;
  return (
    <>
      {participants.map((participant, index) => (
        <React.Fragment key={participant}>
          <span
            className={participantClassName}
            style={{ color: isShowColor ? getOdinIdColor(participant).darkTheme : undefined }}
          >
            <AuthorName odinId={participant} excludeLink={true} />
          </span>
          {participants.length > 1 ? (
            <>
              {index < participants.length - 2
                ? ', '
                : index < participants.length - 1
                  ? ' & '
                  : ''}
            </>
          ) : null}
        </React.Fragment>
      ))}
    </>
  );
};
