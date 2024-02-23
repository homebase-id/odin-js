import { useMatch, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useState, useCallback } from 'react';

import {
  Envelope,
  t,
  Input,
  ActionButton,
  MagnifyingGlass,
  ActionLink,
  Plus,
  usePortal,
  Times,
  Label,
  VolatileInput,
  getTextRootsRecursive,
  PaperPlane,
  useAllContacts,
} from '@youfoundation/common-app';
import { RichText, NewDriveSearchResult, SecurityGroupType } from '@youfoundation/js-lib/core';
import { getNewId } from '@youfoundation/js-lib/helpers';
import { ROOT_PATH } from '../../app/App';
import { useMailConversation } from '../../hooks/mail/useMailConversation';
import { MailConversation } from '../../providers/MailProvider';

export const MailHomeHeader = () => {
  return (
    <section className="sticky left-0 right-0 top-0 z-20 border-b border-gray-100 bg-white px-2 py-2 dark:border-gray-800 dark:bg-black sm:px-5">
      <div className="flex-col">
        <div className="flex flex-row items-center gap-5">
          <h1 className="flex flex-row text-2xl dark:text-white xl:text-3xl">
            <Envelope className="my-auto mr-2 h-6 w-6 flex-shrink-0 sm:mr-4 sm:h-8 sm:w-8" />
            {t('Mail')}
          </h1>
          <MailHomeHeaderSearch />
          <MailComposerButton />
        </div>
      </div>
    </section>
  );
};

const MailHomeHeaderSearch = ({ className }: { className?: string }) => {
  return (
    <div className={`flex w-full flex-row items-center gap-2 ${className || ''}`}>
      <Input className="w-full max-w-md" placeholder={t('Search mail')} />
      <ActionButton icon={MagnifyingGlass} type="mute" size="square" />
    </div>
  );
};

const MailComposerButton = () => {
  const isCompose = useMatch({ path: `${ROOT_PATH}/new` });
  const navigate = useNavigate();

  return (
    <>
      <ActionLink icon={Plus} type="primary" href={`${ROOT_PATH}/new`}>
        {t('Compose')}
      </ActionLink>
      {isCompose ? <ComposerDialog onClose={() => navigate(-1)} /> : null}
    </>
  );
};

const ComposerDialog = ({ onClose }: { onClose: () => void }) => {
  const target = usePortal('modal-container');

  const { mutate: sendMail, status: sendMailStatus } = useMailConversation().send;

  const [recipients, setRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<RichText>();

  const doSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    if (!subject || !message || !recipients.length) return;

    const newEmailConversation: NewDriveSearchResult<MailConversation> = {
      fileMetadata: {
        appData: {
          content: {
            recipients,
            subject,
            message,
            originId: getNewId(),
            threadId: getNewId(),
          },
        },
      },
      serverMetadata: { accessControlList: { requiredSecurityGroup: SecurityGroupType.Connected } },
    };

    console.log('newEmailConversation', newEmailConversation);

    sendMail({ conversation: newEmailConversation, files: [] });
  };

  const dialog = (
    <div className="fixed bottom-16 right-3 w-[calc(100%-1.5rem)] max-w-xl rounded-lg bg-background shadow-md md:bottom-5 md:right-5">
      <div className="mb-3 flex flex-row items-center justify-between px-5 pt-3">
        <h2>{t('New mail')}</h2>
        <ActionButton type="mute" icon={Times} onClick={onClose} size="square" />
      </div>
      <form className="" onSubmit={doSubmit}>
        <div className="flex flex-col gap-2 px-5">
          <div>
            <Label htmlFor="recipients">{t('To')}</Label>
            <RecipientInput id="recipients" recipients={recipients} setRecipients={setRecipients} />
          </div>
          <div>
            <Label htmlFor="subject">{t('Subject')}</Label>
            <Input
              id="subject"
              required
              defaultValue={subject}
              onChange={(e) => setSubject(e.currentTarget.value)}
            />
          </div>
          <hr className="my-2" />
          <div>
            <Label className="sr-only">{t('Message')}</Label>
            <VolatileInput
              defaultValue={getTextRootsRecursive(message || []).join('')}
              onChange={(newValue) =>
                setMessage([
                  {
                    type: 'paragraph',
                    children: [{ text: newValue }],
                  },
                ])
              }
              placeholder="Your message"
              className="min-h-32 w-full rounded border border-gray-300 bg-white px-3 py-1 text-base leading-8 text-gray-700 outline-none transition-colors duration-200 ease-in-out dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-row-reverse gap-2 px-5 pb-5">
          <ActionButton type="primary" icon={PaperPlane} state={sendMailStatus}>
            {t('Send')}
          </ActionButton>

          <ActionButton
            type="secondary"
            onClick={(e) => {
              e.preventDefault();
              onClose();
            }}
            className="mr-auto"
          >
            {t('Discard')}
          </ActionButton>
        </div>
      </form>
    </div>
  );

  return createPortal(dialog, target);
};

const RecipientInput = ({
  recipients,
  setRecipients,
  id,
}: {
  recipients: string[];
  setRecipients: React.Dispatch<React.SetStateAction<string[]>>;
  id?: string;
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [inputStateIndex, setInputStateIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);

  const { data: contacts } = useAllContacts(true);
  const contactResults = contacts
    ? contacts
        .map((dsr) => dsr.fileMetadata.appData.content)
        .filter(
          (contact) =>
            contact.odinId &&
            (!query || contact.odinId?.includes(query) || contact.name?.displayName.includes(query))
        )
    : [];

  const doInsertRecipient = useCallback(
    (odinId: string) => {
      if (!recipients.includes(odinId)) {
        setRecipients((recipients: string[]) =>
          recipients.includes(odinId) ? recipients : [...recipients, odinId]
        );
        // Reset input
        setInputStateIndex((stateIndex) => stateIndex + 1);
        setQuery('');
        setIsFocused(false);
      }
    },
    [setRecipients, setInputStateIndex]
  );

  const doRemoveRecipient = useCallback(
    (odinId: string) => {
      setRecipients((recipients) => recipients.filter((r) => r !== odinId));
    },
    [setRecipients]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % contactResults.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + contactResults.length) % contactResults.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        doInsertRecipient(contactResults[selectedIndex].odinId as string);
      }
    },
    [setSelectedIndex, contactResults, doInsertRecipient]
  );

  return (
    <div className="relative">
      <div
        className={`flex w-full flex-row flex-wrap items-center gap-1 rounded border
        border-gray-300 bg-white px-2 py-1 text-gray-700 transition-colors duration-200 ease-in-out dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 ${isFocused ? 'border-indigo-500 ring-2 ring-indigo-300' : ''}`}
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
          onBlur={() => setIsFocused(false)}
          key={inputStateIndex}
          id={id}
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
