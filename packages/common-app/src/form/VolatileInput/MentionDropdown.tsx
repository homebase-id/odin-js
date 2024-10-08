import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAllContacts, useMostSpace, usePortal } from '../../hooks';
import { VolatileInputAutoCompleteProps } from './VolatileInput';

export interface BaseMentionDropdownProps extends VolatileInputAutoCompleteProps {
  mentionTargets: { name: string; odinId: string }[];
}

export const BaseMentionDropdown = ({
  query,
  onInput,
  position,
  mentionTargets,
}: BaseMentionDropdownProps) => {
  const target = usePortal('emoji-container');
  const enabled = !!(query && query.startsWith('@'));

  const slicedQuery = query?.slice(1);
  const identities = useMemo(
    () =>
      slicedQuery && mentionTargets?.length
        ? mentionTargets?.filter(
            (trgt) =>
              trgt.name &&
              trgt.odinId &&
              (trgt.name.includes(slicedQuery) || trgt.odinId.includes(slicedQuery)) &&
              slicedQuery !== trgt.name &&
              slicedQuery !== trgt.odinId
          )
        : [],
    [slicedQuery, mentionTargets]
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { verticalSpace, horizontalSpace } = useMostSpace(wrapperRef);

  useEffect(() => setActiveIndex(0), [query]);

  const doInput = (odinId: string) => onInput(`@${odinId} `);
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
            className={`flex cursor-pointer flex-row items-center gap-2 px-2 transition-colors ${
              index === activeIndex
                ? 'bg-indigo-200 dark:bg-indigo-800'
                : 'hover:bg-indigo-200 dark:hover:bg-indigo-800'
            }`}
            onClick={() => doInput(identity.odinId)}
          >
            {identity.name} <span className="text-sm">({identity.odinId})</span>
          </li>
        ))}
      </ul>
    </div>
  );

  return createPortal(dialog, target);
};

export const AllContactMentionDropdown = (props: VolatileInputAutoCompleteProps) => {
  const enabled = !!(props.query && props.query.startsWith('@'));

  const { data: allContacts } = useAllContacts(enabled);
  const mentionTargets = useMemo(() => {
    return allContacts
      ?.map((contact) => ({
        name:
          contact.fileMetadata.appData.content.name?.displayName ||
          contact.fileMetadata.appData.content.name?.surname ||
          contact.fileMetadata.appData.content.odinId,
        odinId: contact.fileMetadata.appData.content.odinId,
      }))
      .filter(Boolean) as { name: string; odinId: string }[];
  }, [allContacts]);

  return <BaseMentionDropdown {...props} mentionTargets={mentionTargets} />;
};
