import { useContext, createContext } from 'react';
import { Mentionable } from '../MentionDropdownPlugin';

export const MentionableContext = createContext<Mentionable[] | null>(null);

export const useMentionableContext = () => {
  const mentionables = useContext(MentionableContext);
  if (!mentionables) {
    console.warn('MentionableProvider not found');
  }

  return mentionables || [];
};
