import { ActionButton, CloseEye, Eye, Label, t } from '@youfoundation/common-app';
import useRecoveryKey from '../../hooks/recovery/useRecoveryKey';
import { useEffect, useState } from 'react';

const ShowRecoveryKey = ({ onConfirm }: { onConfirm: () => void }) => {
  const { data: recoveryKey } = useRecoveryKey().fetchKey;

  // Split key in 4 character parts
  const splittedKey = recoveryKey?.key.match(/.{1,4}/g)?.join(' ');

  return (
    <>
      <h1 className="mb-5 text-2xl">Recovery Key</h1>
      <p className="mb-5 text-slate-800">
        Before we continue setting up your identity it{"'"}s important that you can recover access
        to your identity. As your data is encrypted with your password, you can only get access to
        your data with it. If you forget your password, you will lose access to your data.
      </p>
      <p className="text-slate-800">
        To prevent this, we have created a recovery key. This key can be used to reset your password
        and get access to your data again. Please write down this key and store it in a safe place.
      </p>
      <div className="my-5 select-none">
        <Label>{t('Your recovery key')}</Label>
        <ClickToReveal textToShow={splittedKey} />
        <p className="mt-2 text-sm text-slate-400">
          {t(
            'Click to reveal your recovery key, for your safety make sure no one else can see your screen'
          )}
        </p>
      </div>
      <div className="flex flex-row-reverse">
        <ActionButton
          confirmOptions={{
            title: t('Have you stored your recovery key?'),
            body: t(
              'Are you sure you have safely stored your recovery key? There is no way to get the recovery key back if you lose it.'
            ),
            buttonText: t('Yes'),
            type: 'warning',
          }}
          onClick={onConfirm}
        >
          {t('I have safely stored my recovery key')}
        </ActionButton>
      </div>
    </>
  );
};

const ClickToReveal = ({ textToShow }: { textToShow?: string }) => {
  const [show, setShow] = useState(false);
  const redactedText = textToShow?.replace(/[^ ]/g, '•');

  useEffect(() => {
    const timeout = setTimeout(() => {
      setShow(false);
    }, 1000 * 20);

    return () => clearTimeout(timeout);
  }, [show]);

  return (
    <div className="relative">
      <div className="pointer-events-none w-full select-none rounded border border-gray-300 bg-white px-3 py-1 pl-12 text-base leading-8 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
        <span className="block">{show ? textToShow : redactedText}</span>
      </div>
      <div
        className="absolute bottom-0 left-0 top-0 cursor-pointer border-r p-2"
        onClick={() => setShow(!show)}
      >
        {show ? <CloseEye className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
      </div>
    </div>
  );
};

export default ShowRecoveryKey;
