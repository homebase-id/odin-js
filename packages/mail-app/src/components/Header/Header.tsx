import { useEffect, useRef } from 'react';
import {
  t,
  Input,
  ActionButton,
  MagnifyingGlass,
  ActionLink,
  Plus,
  Bars,
  Times,
} from '@youfoundation/common-app';
import { useSearchParams } from 'react-router-dom';
import { ROOT_PATH } from '../../app/App';

export const MailHomeHeader = () => {
  return (
    <section className="sticky left-0 right-0 top-0 z-10 border-b border-gray-100 bg-white px-2 py-2 dark:border-gray-800 dark:bg-black md:px-5">
      <div className="flex-col">
        <div className="flex flex-row items-center gap-2 md:gap-5">
          <MenuButton />
          <MailHomeHeaderSearch />
          <MailComposerButton />
        </div>
      </div>
    </section>
  );
};

const MenuButton = () => {
  return (
    <ActionLink icon={Bars} type="mute" size="square" href={ROOT_PATH} className="md:hidden" />
  );
};

const MailHomeHeaderSearch = ({ className }: { className?: string }) => {
  // const { filter } = useParams<MailFilterParams>();
  // const appliedFilter = filter !== 'inbox' ? filter : undefined;

  const inputRef = useRef<HTMLInputElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q');

  useEffect(() => {
    if (!query && inputRef.current) inputRef.current.value = '';
  }, [query]);

  return (
    <div className={`flex w-full flex-row items-center gap-2 ${className || ''}`}>
      <div className="relative flex w-full max-w-md flex-row">
        <Input
          ref={inputRef}
          className="w-full max-w-md"
          placeholder={t('Search mail')}
          defaultValue={`${searchParams.get('q') || ''}`}
          onChange={(e) => {
            if (e.target.value.length) setSearchParams({ q: e.target.value });
            else setSearchParams({});
          }}
        />
        {query?.length ? (
          <ActionButton
            icon={Times}
            type="mute"
            size="none"
            className="absolute bottom-0 right-0 top-0 m-auto cursor-pointer rounded-none bg-primary/20 p-2 transition-colors hover:bg-primary/30"
            onClick={() => {
              setSearchParams({});
            }}
          />
        ) : null}
      </div>
      <ActionButton icon={MagnifyingGlass} type="mute" size="square" />
    </div>
  );
};

const MailComposerButton = () => {
  return (
    <ActionLink icon={Plus} type="primary" href={`${ROOT_PATH}/new`}>
      {t('New')}
    </ActionLink>
  );
};