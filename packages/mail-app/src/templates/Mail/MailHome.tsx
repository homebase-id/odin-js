import {
  MAIL_APP_ID,
  ExtendPermissionDialog,
  t,
  useRemoveNotifications,
  Envelope,
  Input,
  MagnifyingGlass,
  ActionButton,
  formatToTimeAgoWithRelativeDetail,
  Checkbox,
  ActionGroup,
} from '@youfoundation/common-app';
import { drives, permissions } from '../../hooks/auth/useAuth';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

export const MailHome = () => {
  useRemoveNotifications({ appId: MAIL_APP_ID });

  return (
    <>
      <Helmet>
        <title>Homebase | Mail</title>
      </Helmet>

      <ExtendPermissionDialog
        appName={t('Homebase Mail')}
        appId={MAIL_APP_ID}
        drives={drives}
        permissions={permissions}
      />

      <MailHomeHeader />
      <MailConversations />
    </>
  );
};

const MailHomeHeader = () => {
  return (
    <section className="sticky left-0 right-0 top-0 border-b border-gray-100 bg-white px-2 py-2 dark:border-gray-800 dark:bg-black sm:px-5">
      <div className="flex-col">
        <div className="flex flex-row items-center gap-5">
          <h1 className="flex flex-row text-2xl dark:text-white xl:text-3xl">
            <Envelope className="my-auto mr-2 h-6 w-6 flex-shrink-0 sm:mr-4 sm:h-8 sm:w-8" />
            {t('Mail')}
          </h1>
          <MailHomeHeaderSearch />
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

const MailConversations = () => {
  const conversations = Array.from({ length: 25 });

  return (
    <section className="mx-5 my-5 flex flex-grow flex-col">
      <MailConversationsHeader />
      <div className="flex-grow overflow-auto">
        {conversations.map((_, index) => (
          <MailConversation key={index} />
        ))}
      </div>
    </section>
  );
};

const MailConversationsHeader = () => {
  return (
    <div className="flex flex-row items-center gap-8 rounded-t-lg border-b border-b-slate-100 bg-white p-3 dark:border-b-slate-700 dark:bg-black">
      <Checkbox />
      <ActionGroup
        type="mute"
        size="none"
        options={[
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

const MailConversation = () => {
  return (
    <Link to="/mail/1" className="group">
      <div className="flex flex-col gap-2 border-b border-b-slate-100 bg-white p-3 transition-colors group-last-of-type:border-0 group-hover:bg-slate-50 dark:border-b-slate-700 dark:bg-black dark:group-hover:bg-slate-900">
        <div className="flex flex-row items-center justify-between gap-8">
          <Checkbox onClick={(e) => e.stopPropagation()} />
          <p>John Doe</p>
          <p>What is next for Homebase</p>
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
