import { createPortal } from 'react-dom';

import { t } from '../../../../helpers';
import { usePortal } from '../../../../hooks';
import { DialogWrapper } from '../../../../ui';
import PostComposer from '@youfoundation/feed-app/src/components/SocialFeed/PostComposer';
import { PostFile, PostContent } from '@youfoundation/js-lib/public';

export const RepostDialog = ({
  postFile,
  isOpen,
  onClose,
}: {
  postFile: PostFile<PostContent>;
  isOpen: boolean;
  onClose: () => void;
}) => {
  const target = usePortal('modal-container');

  if (!isOpen) {
    return null;
  }
  const dialog = (
    <DialogWrapper title={t('Repost')} onClose={onClose} isSidePanel={false} size="large">
      <PostComposer embeddedPostFile={postFile} />
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};
