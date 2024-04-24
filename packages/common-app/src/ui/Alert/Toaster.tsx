import { createPortal } from 'react-dom';
import { ReactNode, useState } from 'react';
import { useErrors, type Error } from '../../hooks/errors/useErrors';
import { useNavigate } from 'react-router-dom';
import { formatToTimeAgoWithRelativeDetail } from '../../helpers/timeago/format';
import { ApiType } from '@youfoundation/js-lib/core';
import { useDotYouClient } from '../../hooks/auth/useDotYouClient';
import { useNotifications } from '../../hooks/notifications/useNotifications';
import { t } from '../../helpers/i18n/dictionary';
import { usePortal } from '../../hooks/portal/usePortal';
import { OWNER_ROOT } from '../../core';
import { ActionButton } from '../Buttons/ActionButton';
import { DialogWrapper } from '../Dialog/DialogWrapper';
import { Exclamation } from '../Icons/Exclamation';
import { Times } from '../Icons/Times';
import { Clipboard } from '../Icons/Clipboard';

export const Toaster = ({ errorOnly }: { errorOnly?: boolean }) => {
  const { getApiType } = useDotYouClient();
  const isOwner = getApiType() === ApiType.Owner;
  // Only when logged in via owner we have access to the live notifications;

  return (
    <div className="fixed bottom-2 left-2 right-2 z-50 grid grid-flow-row gap-4 sm:bottom-auto sm:left-auto sm:right-8 sm:top-8">
      <ErrorToaster />
      {isOwner && !errorOnly ? <LiveToaster /> : null}
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

export const ErrorToaster = () => {
  const {
    fetch: { data: errors },
    dismiss: dismissError,
  } = useErrors();

  const [openError, setOpenError] = useState<Error | null>(null);

  return (
    <>
      {errors?.map((error, index) => (
        <Toast
          title={t('Something went wrong')}
          body={error.message}
          key={index}
          onDismiss={() => dismissError(error)}
          onOpen={() => {
            setOpenError(error);
            dismissError(error);
          }}
          type={error.type}
        />
      ))}

      {openError ? <ErrorDialog error={openError} onClose={() => setOpenError(null)} /> : null}
    </>
  );
};

const ErrorDialog = ({ error, onClose }: { error: Error; onClose: () => void }) => {
  const target = usePortal('modal-container');
  const errorDetails = error.details;

  if (!errorDetails) return null;

  const dialog = (
    <DialogWrapper title={error.message} onClose={onClose} isSidePanel={false} size="2xlarge">
      {errorDetails ? (
        <>
          <p className="text-xl mb-2">
            {errorDetails.domain}: {errorDetails.correlationId}
          </p>
          {errorDetails.title || errorDetails.stackTrace ? (
            <div className="overflow-auto max-h-[20rem]">
              <pre>
                <code>
                  {errorDetails.title}
                  {errorDetails.stackTrace}
                </code>
              </pre>
            </div>
          ) : null}

          <div className="flex flex-row-reverse mt-5">
            <ActionButton
              onClick={() => {
                const details = `${errorDetails.domain}: ${errorDetails.correlationId}\n\n${errorDetails.title}\n${errorDetails.stackTrace}`;
                navigator.clipboard.writeText(details);
              }}
              type="primary"
              icon={Clipboard}
            >
              {t('Copy')}
            </ActionButton>
          </div>
        </>
      ) : (
        <>
          <p className="text-xl mb-2">{error.message}</p>
          <div className="flex flex-row-reverse mt-5">
            <ActionButton
              onClick={() => navigator.clipboard.writeText(error.message)}
              type="primary"
              icon={Clipboard}
            >
              {t('Copy')}
            </ActionButton>
          </div>
        </>
      )}
    </DialogWrapper>
  );

  return createPortal(dialog, target);
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
