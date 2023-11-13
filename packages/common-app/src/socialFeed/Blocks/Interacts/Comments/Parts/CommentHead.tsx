import { t } from '../../../../../helpers';
import { useDotYouClient } from '../../../../../hooks';
import { ActionGroup, Pencil, Times, Ellipsis } from '../../../../../ui';
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
  const isAuthor = authorOdinId === getIdentity();

  return (
    <div className="flex flex-row justify-space-between">
      <AuthorName odinId={authorOdinId} />
      {isAuthor && setIsEdit && onRemove ? (
        <ActionGroup
          options={[
            { label: t('Edit'), onClick: () => setIsEdit(true), icon: Pencil },
            {
              label: t('Remove'),
              onClick: onRemove,
              icon: Times,
              // TODO find better fix:
              // Confirmoptions shows a new dialog, which might appear on top of the PostPreview dialog
              // confirmOptions: {
              //   title: t('Remove comment'),
              //   body: `${t('Are you sure you want to remove your comment')}: "${commentBody}"`,
              //   buttonText: t('Remove'),
              // },
            },
          ]}
          type="mute"
          size="small"
          icon={Ellipsis}
        >
          {' '}
        </ActionGroup>
      ) : null}
    </div>
  );
};
