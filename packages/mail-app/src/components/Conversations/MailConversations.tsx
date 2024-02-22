import {
  formatToTimeAgoWithRelativeDetail,
  Checkbox,
  ActionGroup,
  ActionButton,
  Trash,
  t,
} from '@youfoundation/common-app';
import { Link } from 'react-router-dom';
import { ROOT_PATH } from '../../app/App';
import { useState, useEffect } from 'react';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { Archive } from '@youfoundation/common-app';

export const MailConversations = () => {
  const conversations = Array.from({ length: 25 });
  const [selection, setSelection] = useState<string[]>([]);
  const [isAllSelected, setIsAllSelected] = useState(false);
  useEffect(() => setSelection([]), [isAllSelected]);

  return (
    <section className="mx-5 my-5 flex flex-grow flex-col">
      <MailConversationsHeader
        selection={selection}
        isAllSelected={isAllSelected}
        toggleAllSelection={() => setIsAllSelected(!isAllSelected)}
      />
      <div className="flex-grow overflow-auto">
        {conversations.map((_, index) => {
          const conversationId = index.toString();
          const isSelected = selection.includes(conversationId);

          return (
            <MailConversation
              key={index}
              toggleSelection={() =>
                setSelection(
                  isSelected
                    ? [
                        ...selection.filter(
                          (selected) => !stringGuidsEqual(selected, conversationId)
                        ),
                      ]
                    : [...selection, conversationId]
                )
              }
              isSelected={selection.includes(conversationId) || isAllSelected}
            />
          );
        })}
      </div>
    </section>
  );
};

const MailConversationsHeader = ({
  selection,
  isAllSelected,
  toggleAllSelection,
}: {
  selection: string[];
  isAllSelected: boolean;
  toggleAllSelection: () => void;
}) => {
  const hasASelection = selection.length > 0;

  return (
    <div className="flex flex-row items-center rounded-t-lg border-b border-b-slate-100 bg-white px-3 py-1 dark:border-b-slate-700 dark:bg-black">
      <Checkbox checked={isAllSelected} onChange={toggleAllSelection} className="mr-6" />
      {hasASelection ? (
        <>
          <ActionButton
            type="mute"
            className="p-2 text-gray-400 hover:text-black dark:text-gray-500 dark:hover:text-white"
            size="none"
            icon={Trash}
            confirmOptions={{
              title: t('Delete {0} selected conversations', selection.length),
              body: t('Are you sure you want to delete the selected conversations?'),
              buttonText: t('Delete'),
            }}
            onClick={() => {
              //
            }}
          />
          <ActionButton
            type="mute"
            className="p-2 text-gray-400 hover:text-black dark:text-gray-500 dark:hover:text-white"
            size="none"
            icon={Archive}
            onClick={() => {
              //
            }}
          />
        </>
      ) : null}

      <ActionGroup
        type="mute"
        size="none"
        className="p-2 text-gray-400 hover:text-black dark:text-gray-500 dark:hover:text-white"
        options={[
          {
            label: 'Mark as unread',
            onClick: () => {
              //
            },
          },
          {
            label: 'Mark as read',
            onClick: () => {
              //
            },
          },
        ]}
      />
    </div>
  );
};

const MailConversation = ({
  toggleSelection,
  isSelected,
}: {
  toggleSelection: () => void;
  isSelected: boolean;
}) => {
  const conversationId = '123';
  const isUnread = false;

  return (
    <Link to={`${ROOT_PATH}/${conversationId}`} className="group">
      <div
        className={`relative flex flex-col gap-2 border-b border-b-slate-100 p-3 transition-colors group-last-of-type:border-0 dark:border-b-slate-700
          ${isSelected ? 'bg-primary/10' : ''}
          ${!isSelected ? `group-hover:bg-slate-100 dark:group-hover:bg-slate-900 ${isUnread ? 'bg-white dark:bg-black' : 'border-b-slate-200 bg-slate-50 dark:bg-slate-950'}` : ''}`}
      >
        <div
          className={`flex flex-row items-center justify-between gap-4 md:gap-8 ${isUnread ? 'font-semibold' : ''}`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              toggleSelection();
            }}
            className="absolute bottom-0 left-0 top-0 z-10 w-10"
          />
          <Checkbox checked={isSelected} readOnly />
          <div className="flex flex-col md:contents">
            <p>John Doe</p>
            <p className="text-foreground/60 md:text-inherit">What is next for Homebase</p>
          </div>
          <p className="ml-auto text-foreground/50">
            {formatToTimeAgoWithRelativeDetail(new Date(), true)}
          </p>
        </div>

        {/* <MailConversationAttachments /> */}
      </div>
    </Link>
  );
};

const MailConversationAttachments = () => {
  return <div className="flex flex-row justify-end"></div>;
};
