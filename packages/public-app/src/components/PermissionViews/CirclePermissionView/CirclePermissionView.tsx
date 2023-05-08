import { CircleDefinition } from '@youfoundation/js-lib';
import { t } from '@youfoundation/common-app';
import useCircle from '../../../hooks/circles/useCircle';
import { Circles } from '@youfoundation/common-app';
import { LoadingParagraph } from '@youfoundation/common-app';

const CirclePermissionView = ({
  circleDef,
  permissionDetails,
  className,
  isChecked,
  onClick,
  hideMembers,
}: {
  circleDef: CircleDefinition;
  permissionDetails?: string;
  className?: string;
  isChecked?: boolean;
  hideMembers?: boolean;
  onClick?: () => void;
}) => {
  const { data: members, isLoading: membersLoading } = useCircle({
    circleId: !hideMembers ? circleDef?.id : undefined,
  }).fetchMembers;

  if (!circleDef) {
    return <></>;
  }

  const checkedClasses = isChecked
    ? 'border-indigo-500 dark:border-indigo-800'
    : isChecked === false
    ? 'border-slate-100 dark:border-slate-800'
    : '';

  return (
    <a
      onClick={() => onClick && onClick()}
      href={`/owner/circles/${encodeURIComponent(circleDef.id ?? '')}`}
      className={`flex flex-row ${className ?? ''} ${circleDef.disabled && 'opacity-50'} ${
        onClick && 'cursor-pointer'
      } ${checkedClasses}`}
    >
      <Circles className="mb-auto mr-3 mt-1 h-6 w-6 text-foreground" />
      <div className="mr-2 flex flex-col">
        <p className={`my-auto leading-none`}>
          {circleDef.disabled && t('Disabled:')} {circleDef?.name}
          {permissionDetails && `: ${permissionDetails}`}
        </p>
        {!hideMembers ? (
          membersLoading ? (
            <LoadingParagraph className="mt-1 h-4 w-full" />
          ) : (
            <small className="block">
              {members
                ? `${members.length} ${members.length === 1 ? t('member') : t('members')}`
                : null}
            </small>
          )
        ) : null}
      </div>
    </a>
  );
};

export default CirclePermissionView;
