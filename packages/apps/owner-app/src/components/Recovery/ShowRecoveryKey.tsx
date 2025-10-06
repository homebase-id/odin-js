import {ActionButton, Label, t} from '@homebase-id/common-app';
import {useRecoveryKey} from '../../hooks/recovery/useRecoveryKey';
import {useEffect, useState} from 'react';
import {Eye, CloseEye, Clipboard} from '@homebase-id/common-app/icons';

const ShowRecoveryKey = ({onConfirm}: { onConfirm: () => void }) => {
  const {data: recoveryKey} = useRecoveryKey().fetchKey;

  const handleOnConfirm = async () => {
    // const confirmed = await confirmHasKey();
    // if (confirmed) {
    onConfirm();
    // } else {
    //   alert('There was an error confirming you have your recovery key.  Please try again');
    // }
  }

  return (
    <>
      <p className="mb-5">
        Before we continue setting up your identity it{"'"}s important that you can recover access
        to your identity. As your data is encrypted with your password, you can only get access to
        your data with it. If you forget your password, you will lose access to your data.
      </p>
      <p className="">
        To prevent this, we have created a recovery key. This key can be used to reset your password
        and get access to your data again. Please write down this key and store it in a safe place.
      </p>
      <div className="my-5">
        <Label>{t('Your recovery key')}</Label>
        <ClickToReveal textToShow={recoveryKey?.key}/>
        <p className="mt-2 text-sm text-slate-400">
          {t(
            'Click to reveal your recovery key, for your safety make sure no one else can see your screen'
          )}
        </p>
      </div>
      <div className="mt-5 flex flex-row justify-center">
        <ActionButton
          confirmOptions={{
            title: t('Have you stored your recovery key?'),
            body: t(
              'Are you sure you have safely stored your recovery key? There is no way to get the recovery key back if you lose it.'
            ),
            buttonText: t('Yes'),
            type: 'warning',
          }}
          onClick={handleOnConfirm}
        >
          {t('I have safely stored my recovery key')}
        </ActionButton>
      </div>
    </>
  );
};

const ClickToReveal = ({textToShow}: { textToShow?: string | null | undefined }) => {
  const [show, setShow] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const redactedText = textToShow?.replace(/[^ ]/g, '•');

  useEffect(() => {
    const timeout = setTimeout(() => setShow(false), 1000 * 30);
    return () => clearTimeout(timeout);
  }, [show]);

  const doCopy = () => {
    textToShow && navigator.clipboard.writeText(textToShow);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 1500);
  };

  const buttonStyle =
    'flex h-12 w-full cursor-pointer items-center justify-center dark:border-gray-700 md:w-12 text-foreground hover:text-primary dark:hover:text-primary-dark';

  return (
    <>
      <div
        className="relative flex flex-col items-center rounded border border-gray-300 dark:border-gray-700 md:flex-row">
        <div className="flex w-full flex-row justify-around border-b dark:border-gray-700 md:contents">
          <button className={`${buttonStyle} md:border-r`} onClick={() => setShow(!show)}>
            {show ? <CloseEye className="h-6 w-6"/> : <Eye className="h-6 w-6"/>}
          </button>
          <button className={`${buttonStyle} opacity-50 md:order-3 md:border-l`} onClick={doCopy}>
            <Clipboard className="h-6 w-6"/>
          </button>
        </div>

        <div
          className={`w-full bg-white px-3 py-2 text-center text-[1.6rem] leading-8 tracking-wider text-gray-700 dark:bg-gray-800 dark:text-gray-100 md:text-left ${
            show ? '' : 'pointer-events-none select-none break-words'
          }`}
        >
          {show ? textToShow : redactedText}
        </div>

        {showCopied && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-lg bg-slate-800 px-2 py-1 text-sm text-white dark:bg-slate-600">
              {t('Copied to clipboard')}
            </span>
          </div>
        )}
      </div>
    </>
  );
};

export default ShowRecoveryKey;
