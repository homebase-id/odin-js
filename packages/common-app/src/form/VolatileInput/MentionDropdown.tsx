import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDotYouClient, useMostSpace, usePortal } from '../../hooks';
import { useQuery } from '@tanstack/react-query';
import { ContactFile, getContacts } from '@youfoundation/js-lib/network';

export const MentionDropdown = ({
  query,
  onInput,
  position,
}: {
  query?: string;
  onInput: (emoji: string | undefined) => void;
  position?: { x: number; y: number };
}) => {
  const target = usePortal('emoji-container');
  const enabled = !!(query && query.startsWith('@'));
  const { data: mentionTargets } = useMentionTargets(enabled);

  const slicedQuery = query?.slice(1);
  const identities = useMemo(
    () =>
      slicedQuery && mentionTargets?.length
        ? (mentionTargets
            ?.filter(
              (trgt) =>
                trgt.name?.displayName &&
                trgt.odinId &&
                (trgt.name.displayName.includes(slicedQuery) ||
                  trgt.odinId.includes(slicedQuery)) &&
                slicedQuery !== trgt.name.displayName &&
                slicedQuery !== trgt.odinId
            )
            ?.map((trgt) => ({
              name: trgt.name?.displayName,
              odinId: trgt.odinId,
            })) as { name: string; odinId: string }[])
        : [],
    [slicedQuery, mentionTargets]
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { verticalSpace, horizontalSpace } = useMostSpace(wrapperRef);

  useEffect(() => setActiveIndex(0), [query]);

  const doInput = (odinId: string) => onInput(`@${odinId}`);
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!identities || !identities.length) return;

      if (event.key === 'ArrowDown') setActiveIndex((index) => index + 1);
      else if (event.key === 'ArrowUp') setActiveIndex((index) => index - 1);
      else if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey)
        doInput(identities?.[activeIndex].odinId);
      else if (event.key === 'Tab') doInput(identities?.[activeIndex].odinId);
      else return;

      event.stopPropagation();
      event.preventDefault();
    },
    [identities, activeIndex]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!enabled) return null;

  const dialog = (
    <div
      style={
        position
          ? { left: position.x, top: position.y, position: 'fixed', bottom: 'auto', height: '1rem' }
          : undefined
      }
      className="z-50"
      ref={wrapperRef}
    >
      <ul
        className={`bg-background text-foreground absolute flex flex-col overflow-hidden rounded-md py-2 shadow-md ${
          verticalSpace === 'top' ? 'bottom-[100%]' : 'top-[100%]'
        }
        ${horizontalSpace === 'left' ? 'right-0' : 'left-0'}`}
      >
        {identities?.slice(0, 5)?.map((identity, index) => (
          <li
            key={identity.odinId}
            className={`flex cursor-pointer flex-row gap-2 px-2 transition-colors ${
              index === activeIndex
                ? 'bg-indigo-200 dark:bg-indigo-800'
                : 'hover:bg-indigo-200 dark:hover:bg-indigo-800'
            }`}
            onClick={() => doInput(identity.odinId)}
          >
            {identity.name}
          </li>
        ))}
      </ul>
    </div>
  );

  return createPortal(dialog, target);
};

const CHUNKSIZE = 200;
const useMentionTargets = (enabled: boolean) => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  const fetchMentionTargets = async () => {
    // self invoking function that fetches the contacts in blocks of a CHUNKSIZE untill there are no more contacts to fetch
    const internalGetContacts = async (
      cursor: string | undefined,
      limit: number
    ): Promise<ContactFile[]> => {
      const contacts = await getContacts(dotYouClient, cursor, limit);
      if (contacts?.cursorState && contacts.results.length >= limit) {
        const nextContacts = await internalGetContacts(contacts.cursorState, limit);
        return contacts.results.concat(nextContacts);
      }
      return contacts.results;
    };

    return internalGetContacts(undefined, CHUNKSIZE);
  };

  return useQuery(['mention-targets'], fetchMentionTargets, {
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    cacheTime: Infinity,
    staleTime: Infinity,
    enabled,
  });
};
