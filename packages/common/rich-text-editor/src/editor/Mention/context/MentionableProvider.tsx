import { ReactNode } from 'react';

import { MentionableContext } from './useMentionableContext';
import { Mentionable } from '../MentionDropdownPlugin';

export const MentionableProvider = ({
  mentionables,
  children,
}: {
  mentionables: Mentionable[];
  children: ReactNode;
}) => {
  return <MentionableContext.Provider value={mentionables} children={children} />;
};
