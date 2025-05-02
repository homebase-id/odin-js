import { ApiType, OdinClient } from '@homebase-id/js-lib/core';
import { t } from '../../../../../helpers';
import { useOdinClientContext } from '../../../../../hooks';
import { AuthorName } from '../../../Author/AuthorName';
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
  const loggedOnIdentity = useOdinClientContext().getLoggedInIdentity();
  const isAuthor = authorOdinId === loggedOnIdentity;

  const actionOptions = [];

  if (loggedOnIdentity && isAuthor && setIsEdit && onRemove) {
    actionOptions.push({ label: t('Edit'), onClick: () => setIsEdit(true), icon: Pencil });
    actionOptions.push({ label: t('Remove'), onClick: onRemove, icon: Times });
  }

  // idenity && to make sure the user is logged in
  if (loggedOnIdentity && !isAuthor) {
    actionOptions.push({
      icon: Block,
      label: `${t('Block this user')}`,
      href: `${new OdinClient({ hostIdentity: loggedOnIdentity, api: ApiType.Guest }).getRoot()}/owner/connections/${authorOdinId}/block`,
    });
  }

  return (
    <div className="flex flex-row justify-space-between">
      <AuthorName odinId={authorOdinId} />
      <ActionGroup options={actionOptions} type="mute" size="none" className="px-3 py-1 text-sm" />
    </div>
  );
};
