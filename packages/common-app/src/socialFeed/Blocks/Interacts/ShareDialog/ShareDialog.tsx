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
            <small className="block text-sm text-slate-400">&quot;{title}&quot;</small>
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
        ></ActionLink>
        <ActionLink
          href={`https://www.facebook.com/sharer.php?u=${href}`}
          icon={Facebook}
          type="secondary"
          size="square"
          className="justify-center"
          target="_blank"
          rel="noopener noreferrer"
        ></ActionLink>
        <ActionLink
          href={`https://twitter.com/share?url=${href}&text=${title || ''}`}
          icon={Twitter}
          type="secondary"
          size="square"
          className="justify-center"
          target="_blank"
          rel="noopener noreferrer"
        ></ActionLink>
        <ActionLink
          href={`https://www.linkedin.com/shareArticle?url=${href}&title=${title || ''}`}
          icon={Linkedin}
          type="secondary"
          size="square"
          className="justify-center"
          target="_blank"
          rel="noopener noreferrer"
        ></ActionLink>
        <ActionLink
          href={`https://reddit.com/submit?url=${href}&title=${title || ''}`}
          icon={Reddit}
          type="secondary"
          size="square"
          className="justify-center"
          target="_blank"
          rel="noopener noreferrer"
        ></ActionLink>
      </div>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};
