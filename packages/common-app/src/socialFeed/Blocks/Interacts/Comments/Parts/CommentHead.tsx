import { t } from '../../../../../helpers';
import { useDotYouClient } from '../../../../../hooks';
import { ActionGroup, Pencil, Times, Ellipsis, Block } from '../../../../../ui';
import { AuthorName } from '../../../Author/Name';

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
  const { getIdentity } = useDotYouClient();
  const identity = getIdentity();
  const isAuthor = authorOdinId === identity;

  const actionOptions = [];

  if (isAuthor && setIsEdit && onRemove) {
    actionOptions.push({ label: t('Edit'), onClick: () => setIsEdit(true), icon: Pencil });
    actionOptions.push({ label: t('Remove'), onClick: onRemove, icon: Times });
  }

  if (!isAuthor) {
    actionOptions.push({
      icon: Block,
      label: `${t('Block this user')}`,
      href: `https://${identity}/owner/connections/${authorOdinId}/block`,
    });
  }

  return (
    <div className="flex flex-row justify-space-between">
      <AuthorName odinId={authorOdinId} />
      <ActionGroup options={actionOptions} type="mute" size="small" />
    </div>
  );
};
