import { useSearchParams, useNavigate } from 'react-router-dom';

import {
  t,
  Input,
  ActionButton,
  MagnifyingGlass,
  ActionLink,
  Plus,
} from '@youfoundation/common-app';
import { ComposerDialog } from '../Composer/MailComposerDialog';

export const MailHomeHeader = () => {
  return (
    <section className="sticky left-0 right-0 top-0 z-20 border-b border-gray-100 bg-white px-2 py-2 dark:border-gray-800 dark:bg-black sm:px-5">
      <div className="flex-col">
        <div className="flex flex-row items-center gap-5">
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
  const [searchParams] = useSearchParams();
  const isCompose = searchParams.has('new');
  const navigate = useNavigate();

  return (
    <>
      <ActionLink icon={Plus} type="primary" href={`?new`}>
        {t('Compose')}
      </ActionLink>
      {isCompose ? <ComposerDialog onClose={() => navigate(-1)} /> : null}
    </>
  );
};
