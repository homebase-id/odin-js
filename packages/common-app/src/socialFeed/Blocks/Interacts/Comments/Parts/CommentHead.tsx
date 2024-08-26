import { ApiType, DotYouClient } from '@youfoundation/js-lib/core';
import { t } from '../../../../../helpers';
import { useDotYouClient } from '../../../../../hooks';
import { AuthorName } from '../../../Author/Name';
import { Block, Pencil, Times } from '../../../../../ui/Icons';
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
  const { getIdentity } = useDotYouClient();
  const identity = getIdentity();
  const isAuthor = authorOdinId === identity;

  const actionOptions = [];

  if (identity && isAuthor && setIsEdit && onRemove) {
    actionOptions.push({ label: t('Edit'), onClick: () => setIsEdit(true), icon: Pencil });
    actionOptions.push({ label: t('Remove'), onClick: onRemove, icon: Times });
  }

  // idenity && to make sure the user is logged in
  if (identity && !isAuthor) {
    actionOptions.push({
      icon: Block,
      label: `${t('Block this user')}`,
      href: `${new DotYouClient({ identity, api: ApiType.Guest }).getRoot()}/owner/connections/${authorOdinId}/block`,
    });
  }

  return (
    <div className="flex flex-row justify-space-between">
      <AuthorName odinId={authorOdinId} />
      <ActionGroup options={actionOptions} type="mute" size="small" />
    </div>
  );
};
