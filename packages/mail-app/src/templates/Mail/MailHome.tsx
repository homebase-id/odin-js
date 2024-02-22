import {
  MAIL_APP_ID,
  ExtendPermissionDialog,
  t,
  useRemoveNotifications,
  Envelope,
  Input,
  MagnifyingGlass,
  ActionButton,
  Plus,
  ActionLink,
  usePortal,
  VolatileInput,
  Label,
  Times,
  PaperPlane,
} from '@youfoundation/common-app';
import { drives, permissions } from '../../hooks/auth/useAuth';
import { Helmet } from 'react-helmet-async';
import { ROOT_PATH } from '../../app/App';
import { MailConversations } from '../../components/Conversations/MailConversations';
import { useMatch, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';

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

  const dialog = (
    <div className="fixed bottom-16 right-3 w-[calc(100%-1.5rem)] max-w-md rounded-lg bg-background shadow-md md:bottom-5 md:right-5">
      <div className="mb-5 flex flex-row items-center justify-between px-5 pt-5">
        <h2>{t('New mail')}</h2>
        <ActionButton type="mute" icon={Times} onClick={onClose} size="square" />
      </div>
      <form
        className=""
        onSubmit={() => {
          console.log('new mail');
        }}
      >
        <div className="flex flex-col gap-2 px-5">
          <div>
            <Label>{t('To')}</Label>
            <Input required />
          </div>
          <div>
            <Label>{t('Subject')}</Label>
            <Input required />
          </div>
          <div>
            <Label>{t('Message')}</Label>
            <VolatileInput
              defaultValue=""
              className="min-h-32 w-full rounded border border-gray-300 bg-white px-3 py-1 text-base leading-8 text-gray-700 outline-none transition-colors duration-200 ease-in-out dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-row-reverse gap-2 px-5 pb-5">
          <ActionButton type="primary" icon={PaperPlane}>
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
