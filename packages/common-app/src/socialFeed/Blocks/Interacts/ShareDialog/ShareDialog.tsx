import { createPortal } from 'react-dom';

import { t } from '../../../../helpers';
import {
  ActionLink,
  DialogWrapper,
  Facebook,
  Linkedin,
  Twitter,
  Whatsapp,
  Reddit,
} from '../../../../ui';
import { usePortal } from '../../../../hooks';
import { Input } from '../../../../form/Input';
import { Clipboard } from '../../../../ui/Icons/Clipboard';
import { useState } from 'react';
import { Label } from '../../../../form';

export const ShareDialog = ({
  onClose,
  href,
  title,
}: {
  onClose: () => void;
  href: string;
  title?: string;
}) => {
  const target = usePortal('modal-container');

  const dialog = (
    <DialogWrapper
      title={
        <span className="">
          {t('Share')}{' '}
          {title ? (
            <small className="block text-sm text-slate-400 break-all">&quot;{title}&quot;</small>
          ) : null}
        </span>
      }
      onClose={onClose}
      isSidePanel={false}
      size="large"
    >
      <div className="grid grid-cols-5 gap-2 sm:gap-4">
        <ActionLink
          href={`https://api.whatsapp.com/send?text=${title || ''} ${href}`}
          icon={Whatsapp}
          type="secondary"
          size="square"
          className="justify-center"
          target="_blank"
          rel="noopener noreferrer"
        />
        <ActionLink
          href={`https://www.facebook.com/sharer.php?u=${href}`}
          icon={Facebook}
          type="secondary"
          size="square"
          className="justify-center"
          target="_blank"
          rel="noopener noreferrer"
        />
        <ActionLink
          href={`https://twitter.com/share?url=${href}&text=${title || ''}`}
          icon={Twitter}
          type="secondary"
          size="square"
          className="justify-center"
          target="_blank"
          rel="noopener noreferrer"
        />
        <ActionLink
          href={`https://www.linkedin.com/shareArticle?url=${href}&title=${title || ''}`}
          icon={Linkedin}
          type="secondary"
          size="square"
          className="justify-center"
          target="_blank"
          rel="noopener noreferrer"
        />
        <ActionLink
          href={`https://reddit.com/submit?url=${href}&title=${title || ''}`}
          icon={Reddit}
          type="secondary"
          size="square"
          className="justify-center"
          target="_blank"
          rel="noopener noreferrer"
        />
      </div>
      <div className="mt-7">
        <Label>Permalink:</Label>
        <ClickToCopy text={href} />
      </div>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};

const ClickToCopy = ({ text }: { text: string }) => {
  const [showCopied, setShowCopied] = useState(false);

  const doCopy = () => {
    text && navigator.clipboard.writeText(text);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 1500);
  };

  return (
    <div className="relative cursor-pointer" onClick={doCopy}>
      <Input readOnly className="pointer-events-none pl-12" value={text} />
      <div className="absolute bottom-0 left-0 top-0 border-r p-2">
        <Clipboard className="h-6 w-6" />
      </div>
      {showCopied && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="rounded-lg bg-slate-800 px-2 py-1 text-sm text-white dark:bg-slate-600">
            {t('Copied to clipboard')}
          </span>
        </div>
      )}
    </div>
  );
};
