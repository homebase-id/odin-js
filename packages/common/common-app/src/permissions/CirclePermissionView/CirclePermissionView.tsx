import {
  AUTO_CONNECTIONS_CIRCLE_ID,
  CircleDefinition,
  CONFIRMED_CONNECTIONS_CIRCLE_ID,
} from '@homebase-id/js-lib/network';
import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useCircle } from '../../hooks/circles/useCircle';
import { Circles } from '../../ui/Icons/Circles';
import { LoadingBlock } from '../../ui/LoadingBlock/LoadingBlock';
import { Arrow } from '../../ui/Icons/Arrow';
import { t } from '../../helpers/i18n/dictionary';
import { ApiType, OdinClient } from '@homebase-id/js-lib/core';
import { useOdinClientContext } from '../../hooks';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';

export const CirclePermissionView = ({
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
  const loggedInIdentity = useOdinClientContext().getLoggedInIdentity();
  const isSystemCircle =
    stringGuidsEqual(circleDef.id, CONFIRMED_CONNECTIONS_CIRCLE_ID) ||
    stringGuidsEqual(circleDef.id, AUTO_CONNECTIONS_CIRCLE_ID);

  if (!circleDef) return null;
  if (!loggedInIdentity) return null;

  const LinkWrapper = ({ children, className }: { children: ReactNode; className: string }) =>
    onClick ? (
      <a onClick={() => onClick && onClick()} className={className ?? ''}>
        {children}
      </a>
    ) : (
      <Link
        to={`${new OdinClient({ hostIdentity: loggedInIdentity, api: ApiType.App }).getRoot()}/owner/circles/${encodeURIComponent(circleDef.id || '')}`}
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
      className={`flex flex-row items-center ${className ?? ''} ${circleDef.disabled && 'opacity-50'} ${
        onClick && 'cursor-pointer'
      } ${checkedClasses}`}
    >
      <Circles className="mr-3 h-6 w-6" />
      <div className="mr-2 flex flex-col">
        <p className={`my-auto leading-none`}>
          {circleDef.disabled && t('Disabled:')} {circleDef?.name}
          {permissionDetails && `: ${permissionDetails}`}
          <span className="text-sm block text-slate-400">
            {isSystemCircle ? t('This is a built-in circle.') : circleDef.description || ' '}
          </span>
        </p>
        {!hideMembers ? (
          membersLoading ? (
            <LoadingBlock className="mt-1 h-4 w-full" />
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
