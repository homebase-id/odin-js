import { useState, useCallback } from 'react';

import { useAllContacts, ActionButton, useOdinClientContext } from '@homebase-id/common-app';
import { Times } from '@homebase-id/common-app/icons';
import { ContactFile } from '@homebase-id/js-lib/network';

export const RecipientInput = ({
  recipients,
  setRecipients,
  id,
  autoFocus,
}: {
  recipients: string[];
  setRecipients: (newRecipients: string[]) => void;
  id?: string;
  autoFocus?: boolean;
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [inputStateIndex, setInputStateIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const loggedOnIdentity = useOdinClientContext().getLoggedInIdentity();

  const ownContactFile: ContactFile = {
    odinId: loggedOnIdentity,
    name: {
      displayName: 'You',
    },
    source: 'user',
  };

  const { data: contacts } = useAllContacts(true);
  const contactResults = [
    ...(contacts
      ? contacts
          .map((dsr) => dsr.fileMetadata.appData.content)
          .filter(
            (contact) =>
              contact.odinId &&
              (!query ||
                contact.odinId?.includes(query) ||
                contact.name?.displayName?.includes(query))
          )
      : []),
    ownContactFile,
  ];

  const doInsertRecipient = useCallback(
    (odinId: string) => {
      if (!recipients.includes(odinId)) {
        setRecipients(recipients.includes(odinId) ? recipients : [...recipients, odinId]);
        // Reset input
        setSelectedIndex(0);
        setInputStateIndex((stateIndex) => stateIndex + 1);
        setQuery('');
        setIsFocused(false);
      }
    },
    [recipients, setRecipients, setInputStateIndex]
  );

  const doRemoveRecipient = useCallback(
    (odinId: string) => {
      setRecipients(recipients.filter((r) => r !== odinId));
    },
    [recipients, setRecipients]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % contactResults.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + contactResults.length) % contactResults.length);
      } else if ((e.key === 'Enter' || e.key === 'Tab') && query.length && contactResults.length) {
        e.preventDefault();
        doInsertRecipient(contactResults[selectedIndex].odinId as string);
      }
    },
    [setSelectedIndex, contactResults, doInsertRecipient]
  );

  return (
    <div className="relative">
      <div
        className={`flex w-full flex-row flex-wrap items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-gray-700 transition-colors duration-200 ease-in-out dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 ${isFocused ? 'border-indigo-500 ring-2 ring-indigo-300' : ''}`}
      >
        {recipients.map((recipient) => (
          <p
            key={recipient}
            className="flex flex-row gap-2 rounded-full bg-primary/15 px-3 py-1 text-sm"
          >
            {recipient}
            <ActionButton
              type="mute"
              size="none"
              className="text-foreground opacity-50 hover:opacity-100"
              icon={Times}
              onClick={(e) => {
                e.preventDefault();
                doRemoveRecipient(recipient);
              }}
            />
          </p>
        ))}
        <input
          className="w-10 flex-grow px-1 text-base leading-8 outline-none"
          type="text"
          onChange={(e) => setQuery(e.currentTarget.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // Small delay to allow click events to fire first;
            setTimeout(() => setIsFocused(false), 200);
          }}
          key={inputStateIndex}
          id={id}
          autoFocus={autoFocus}
          autoComplete="off"
        />
      </div>
      {query.length ? (
        <ul
          className={`absolute top-full z-10 w-full bg-background shadow-md ${isFocused ? 'block' : ''}`}
        >
          {contactResults.map((contact, index) => {
            const isRecipient = recipients.includes(contact.odinId as string);
            return (
              <li
                key={contact.odinId}
                className={`px-2 py-1 ${isRecipient ? 'opacity-50' : `cursor-pointer ${selectedIndex === index ? 'bg-primary/15' : 'hover:bg-primary/15'}`}`}
                onClick={(e) => {
                  e.preventDefault();
                  doInsertRecipient(contact.odinId as string);
                }}
              >
                <p className="flex flex-col gap-0">
                  {contact.name?.displayName}
                  <small className="leading-none text-foreground/40">{contact.odinId}</small>
                </p>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
};
