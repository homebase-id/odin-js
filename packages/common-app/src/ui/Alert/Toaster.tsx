import { ReactNode } from 'react';
import {
  ActionButton,
  Exclamation,
  OWNER_ROOT,
  Times,
  t,
  useDotYouClient,
  useNotifications,
} from '@youfoundation/common-app';
import { useNavigate } from 'react-router-dom';
import { useErrors } from '@youfoundation/common-app';
import { formatToTimeAgoWithRelativeDetail } from '../../helpers/timeago/format';
import { ApiType } from '@youfoundation/js-lib/core';

export const Toaster = () => {
  const { getApiType } = useDotYouClient();
  const isOwner = getApiType() === ApiType.Owner;
  // Only when logged in via owner we have access to the live notifications;

  return (
    <div className="fixed bottom-2 left-2 right-2 z-50 grid grid-flow-row gap-4 sm:bottom-auto sm:left-auto sm:right-8 sm:top-8">
      <ErrorToaser />
      {isOwner ? <LiveToaster /> : null}
    </div>
  );
};

export const LiveToaster = () => {
  const { liveNotifications, dismiss } = useNotifications();

  return (
    <>
      {liveNotifications.slice(0, 5).map((notification, index) => (
        <Toast
          {...notification}
          type={undefined}
          key={index}
          onDismiss={() => dismiss(notification)}
          onOpen={() => dismiss(notification)}
        />
      ))}
      {liveNotifications.length > 5 ? (
        <div className="flex justify-center">
          <div className="w-9 rounded-lg bg-white pb-3 pt-1 text-center leading-[0] shadow-md">
            ...
          </div>
        </div>
      ) : null}
    </>
  );
};

export const ErrorToaser = () => {
  const {
    fetch: { data: errors },
    dismiss: dismissError,
  } = useErrors();

  return (
    <>
      {errors?.map((error, index) => (
        <Toast
          title={t('Something went wrong')}
          body={error.message}
          key={index}
          onDismiss={() => dismissError(error)}
          onOpen={() => dismissError(error)}
          type={error.type}
        />
      ))}
    </>
  );
};

export const Toast = ({
  title,
  body,
  timestamp,
  groupCount,
  imgSrc,
  onDismiss,
  onOpen,
  href,
  type,
  isRead,
}: {
  title: string;
  body?: string | ReactNode;
  timestamp?: number;
  groupCount?: number;
  imgSrc?: string;
  onDismiss?: () => void;
  onOpen?: () => void;
  href?: string;
  type?: 'critical' | 'warning';
  isRead?: boolean;
}) => {
  const navigate = useNavigate();

  const fadeAfter =
    'relative after:content-[""] after:absolute after:top-[1.6rem] after:w-[50%] after:h-[1.4rem] after:bg-gradient-to-l after:from-white dark:after:from-black after:to-transparent';

  const doOpen = () => {
    if (href && href.startsWith(OWNER_ROOT)) navigate(href);
    else if (href) {
      onOpen && onOpen();
      window.location.href = href;
    }

    onOpen && onOpen();
  };

  return (
    <div
      className={`relative flex max-w-sm flex-row rounded-md bg-white px-2 py-2 shadow-md dark:bg-black dark:text-slate-300 ${
        href || onOpen ? 'cursor-pointer' : ''
      }`}
      onClick={doOpen}
    >
      {imgSrc ? (
        <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full">
          <img src={imgSrc} className="h-full w-full object-cover" />
        </div>
      ) : type === 'critical' ? (
        <div className={`m-auto flex h-8 w-8 flex-shrink-0 text-red-400 dark:text-red-300`}>
          <Exclamation />
        </div>
      ) : type === 'warning' ? (
        <div className={`m-auto flex h-8 w-8 flex-shrink-0 text-orange-400`}>
          <Exclamation />
        </div>
      ) : null}

      <div className="flex-grow-1 pl-3">
        <p
          className={`max-h-12 w-full overflow-hidden text-ellipsis pr-8 font-medium ${fadeAfter} after:right-8`}
        >
          {title}
          {isRead ? null : (
            <span className="inline-block relative ml-2 bottom-[0.1rem] h-2 w-2 rounded-full bg-primary"></span>
          )}
        </p>
        {body ? (
          <p className={`max-h-12 overflow-hidden ${fadeAfter} after:right-0`}>{body}</p>
        ) : null}
        {timestamp ? (
          <p className="text-foreground/80">
            {formatToTimeAgoWithRelativeDetail(new Date(timestamp))}
          </p>
        ) : null}
        {groupCount ? (
          <p className="text-primary">
            {groupCount} {t('more')}
          </p>
        ) : null}
      </div>
      {onDismiss && (
        <ActionButton
          icon={Times}
          size="square"
          className="absolute right-2 top-1 mb-auto rounded-full opacity-60 hover:opacity-100"
          type="mute"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onDismiss && onDismiss();
          }}
        />
      )}
    </div>
  );
};
