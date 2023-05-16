import { useState } from 'react';
import { createPortal } from 'react-dom';
import { t } from '@youfoundation/common-app';
import { usePortal } from '@youfoundation/common-app';
import { Label } from '@youfoundation/common-app';
import { Input } from '@youfoundation/common-app';
import { ActionButton } from '@youfoundation/common-app';
import { DialogWrapper } from '@youfoundation/common-app';

export interface LinkButtonProps {
  linkText: string;
  uri: string;
}

const defaultProps = { linkText: '', uri: '' };
const LinkButtonDialog = ({
  title,
  confirmText,
  isOpen,
  onConfirm,
  onCancel,
  buttonProps,
}: {
  title: string;
  confirmText?: string;
  isOpen: boolean;
  buttonProps?: LinkButtonProps;
  onConfirm: (buttonProps: LinkButtonProps) => void;
  onCancel: () => void;
}) => {
  const target = usePortal('modal-container');
  const [linkButtonProps, setLinkButtonProps] = useState<LinkButtonProps>(
    buttonProps ?? defaultProps
  );

  if (!isOpen) {
    return null;
  }

  const dialog = (
    <>
      <DialogWrapper title={title} onClose={onCancel}>
        <form
          onSubmit={(e) => {
            e.preventDefault();

            onConfirm({ ...linkButtonProps });
            setLinkButtonProps(defaultProps);

            return false;
          }}
        >
          <div className="mb-5">
            <Label htmlFor="linkText">{t('Text')}</Label>
            <Input
              id="linkText"
              name="linkText"
              defaultValue={linkButtonProps.linkText}
              onChange={(e) => {
                setLinkButtonProps({ ...linkButtonProps, linkText: e.target.value });
              }}
              required
            />
          </div>

          <div className="mb-5">
            <Label htmlFor="url">{t('Url')}</Label>
            <Input
              id="uri"
              name="uri"
              defaultValue={linkButtonProps.uri}
              onChange={(e) => {
                setLinkButtonProps({ ...linkButtonProps, uri: e.target.value });
              }}
              required
            />
          </div>

          <div className="-m-2 flex flex-row-reverse px-4 py-3">
            <ActionButton className="m-2" state="idle">
              {confirmText ?? 'Save'}
            </ActionButton>
            <ActionButton className="m-2" type="secondary" onClick={onCancel}>
              {t('Cancel')}
            </ActionButton>
          </div>
        </form>
      </DialogWrapper>
    </>
  );

  return createPortal(dialog, target);
};

export default LinkButtonDialog;
