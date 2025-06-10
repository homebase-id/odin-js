import { createPortal } from 'react-dom';

import { t } from '../../../../helpers';
import { usePortal } from '../../../../hooks';
import { DialogWrapper } from '../../../../ui';
import { EmbeddedPost } from '@homebase-id/js-lib/public';
import PostComposer from '../../../Composer/PostComposer';

export const RepostDialog = ({
  embeddedPost,
  isOpen,
  onClose,
}: {
  embeddedPost: EmbeddedPost;
  isOpen: boolean;
  onClose: () => void;
}) => {
  const target = usePortal('modal-container');

  if (!isOpen) {
    return null;
  }
  const dialog = (
    <DialogWrapper title={t('Repost')} keepOpenOnBlur={true} onClose={onClose} isSidePanel={false} size="large">
      <PostComposer embeddedPost={embeddedPost} onPost={onClose} excludeCustom={true} />
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};
