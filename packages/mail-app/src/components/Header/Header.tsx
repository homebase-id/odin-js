import { useMatch, useNavigate } from 'react-router-dom';

import {
  Envelope,
  t,
  Input,
  ActionButton,
  MagnifyingGlass,
  ActionLink,
  Plus,
} from '@youfoundation/common-app';
import { ROOT_PATH } from '../../app/App';
import { ComposerDialog } from '../Composer/MailComposerDialog';

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
