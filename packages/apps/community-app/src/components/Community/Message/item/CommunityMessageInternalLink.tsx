import type { ReactNode } from 'react';
import { COMMUNITY_ROOT_PATH } from '@homebase-id/common-app';
import { Link } from '@homebase-id/common-app/icons';

// Typed attributes for custom inline referenced message nodes
export type ReferencedMessageAttributes = {
  hint?: string;
  messageId: string;
  channelId: string;
  threadId?: string;
  odinId: string;
  communityId: string;
};

export const CommunityMessageInternalLink = ({
  attributes,
  children,
}: {
  attributes?: Record<string, unknown>;
  children?: ReactNode;
}) => {
  const { messageId, channelId, threadId, odinId, communityId } =
    attributes as ReferencedMessageAttributes;

  const link = `${COMMUNITY_ROOT_PATH}/${odinId}/${communityId}/${channelId}/${
    threadId ? `${threadId}/thread/` : ``
  }${messageId}`;
  return (
    <a href={link} className="*: rounded bg-primary/10 px-1 text-primary hover:bg-primary/20">
      <Link className="mr-1 inline h-4 w-4 shrink-0 select-none align-middle" aria-hidden="true" />
      <span>{children}</span>
    </a>
  );
};
