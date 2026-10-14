import { t } from '../../../../../helpers';
import { useDotYouClientContext } from '../../../../../hooks';
import { AuthorName } from '../../../Author/AuthorName';
import { Pencil, Times } from '../../../../../ui/Icons';
import { ActionGroup } from '../../../../../ui';

export const CommentHead = ({
  authorOdinId,
  setIsEdit,
  // commentBody,
  onRemove,
}: {
  authorOdinId: string;
  setIsEdit?: (isEdit: boolean) => void;
  commentBody: string;
  onRemove?: () => void;
}) => {
  const loggedOnIdentity = useDotYouClientContext().getLoggedInIdentity();
  const isAuthor = authorOdinId === loggedOnIdentity;

  const actionOptions = [];

  if (loggedOnIdentity && isAuthor && setIsEdit && onRemove) {
    actionOptions.push({ label: t('Edit'), onClick: () => setIsEdit(true), icon: Pencil });
    actionOptions.push({ label: t('Remove'), onClick: onRemove, icon: Times });
  }

  return (
    <div className="flex flex-row justify-space-between">
      <AuthorName odinId={authorOdinId} />
      <ActionGroup options={actionOptions} type="mute" size="none" className="px-3 py-1 text-sm" />
    </div>
  );
};
