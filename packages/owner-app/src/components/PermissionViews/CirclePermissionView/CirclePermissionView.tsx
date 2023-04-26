import { CircleDefinition } from '@youfoundation/js-lib';
import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../../../helpers/i18n/dictionary';
import useCircle from '../../../hooks/circles/useCircle';
import Arrow from '../../ui/Icons/Arrow/Arrow';
import Circles from '../../ui/Icons/Circles/Circles';
import LoadingParagraph from '../../ui/Loaders/LoadingParagraph/LoadingParagraph';

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
    circleId: !hideMembers && circleDef?.id,
  }).fetchMembers;

  if (!circleDef) {
    return <></>;
  }

  const LinkWrapper = ({ children, className }: { children: ReactNode; className: string }) =>
    onClick ? (
      <a onClick={() => onClick && onClick()} className={className ?? ''}>
        {children}
      </a>
    ) : (
      <Link
        to={`/owner/circles/${encodeURIComponent(circleDef.id)}`}
        className={`hover:text-slate-700 hover:underline dark:hover:text-slate-400 ${
          className ?? ''
        }`}
      >
        {children}
      </Link>
    );

  const checkedClasses = isChecked
    ? 'border-indigo-500 dark:border-indigo-800'
    : isChecked === false
    ? 'border-slate-100 dark:border-slate-800'
    : '';

  return (
    <LinkWrapper
      className={`flex flex-row ${className ?? ''} ${circleDef.disabled && 'opacity-50'} ${
        onClick && 'cursor-pointer'
      } ${checkedClasses}`}
    >
      <Circles className="mb-auto mr-3 mt-1 h-6 w-6" />
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
      {!onClick && <Arrow className="my-auto ml-2 h-5 w-5" />}
    </LinkWrapper>
  );
};

export default CirclePermissionView;
