import { useState } from 'react';
import { useParams } from 'react-router-dom';
import ConnectionCard from '../../../components/Connection/ConnectionCard/ConnectionCard';
import LoadingDetailPage from '../../../components/ui/Loaders/LoadingDetailPage/LoadingDetailPage';
import DrivePermissionView from '../../../components/PermissionViews/DrivePermissionView/DrivePermissionView';
import Section, { SectionTitle } from '../../../components/ui/Sections/Section';
import { AppInteractionPermissionOverview } from '../../../components/PermissionViews/AppInteractionPermissionView/AppInteractionPermissionView';
import { PageMeta } from '@homebase-id/common-app';
import {
  AUTO_CONNECTIONS_CIRCLE_ID,
  CircleDesignation,
  CircleGrantOn,
  CONFIRMED_CONNECTIONS_CIRCLE_ID,
  Membership,
} from '@homebase-id/js-lib/network';
import { Link } from 'react-router-dom';
import { useApps } from '../../../hooks/apps/useApps';
import {
  Fact,
  OWNERSHIP_HINTS,
  formatTimestamp,
} from '../../../components/Apps/AppOverviewParts';
import DomainCard from '../../../components/Connection/DomainCard/DomainCard';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import CircleAppInteractionDialog from '../../../components/Circles/CircleAppInteractionDialog/CircleAppInteractionDialog';
import CircleDialog from '../../../components/Circles/CircleDialog/CircleDialog';
import MemberLookupDialog from '../../../components/Circles/MemberLookupDialog/MemberLookupDialog';
import DrivePermissionSelectorDialog from '../../../components/Drives/DrivePermissionSelectorDialog/DrivePermissionSelectorDialog';
import {
  useCircle,
  t,
  ErrorNotification,
  ActionButton,
  ActionGroup,
  Alert,
  SubtleMessage,
  mergeStates,
} from '@homebase-id/common-app';
import {
  Circles,
  Pencil,
  Ellipsis,
  Persons,
  Trash,
  Check,
  Block,
  Plus,
  Times,
} from '@homebase-id/common-app/icons';

const CircleDetails = () => {
  const { circleKey } = useParams();
  const decodedCircleKey = circleKey ? decodeURIComponent(circleKey) : undefined;
  const {
    fetch: { data: circle, isLoading: circleLoading },
    fetchMembers: { data: members, isLoading: membersLoading },
    provideGrants: { mutateAsync: addMembers, status: addMemberStatus, error: addMembersError },
    revokeIdentityGrants: {
      mutateAsync: removeMembers,
      status: removeMemberStatus,
      error: removeMembersError,
    },
    createOrUpdate: { mutate: updateCircle, status: updateCircleStatus, error: updateCircleError },
    enableCircle: { mutate: enableCircle, error: enableCircleError },
    disableCircle: { mutate: disableCircle, error: disableCircleError },
    removeCircle: { mutateAsync: removeCircle, error: removeCircleError },
  } = useCircle({ circleId: decodedCircleKey });

  const { data: apps } = useApps().fetchRegistered;

  const [isOpenEdit, setIsOpenEdit] = useState(false);
  const [isOpenMemberLookup, setIsOpenMemberLookup] = useState(false);
  const [isOpenAppInteractionDialog, setIsOpenAppInteractionDialog] = useState(false);
  const [isDrivesEditOpen, setIsDrivesEditOpen] = useState(false);

  if (circleLoading) return <LoadingDetailPage />;
  if (!circle || !circle.id || !decodedCircleKey) return <>{t('No matching circle found')}</>;

  const circleId = circle.id;

  // The app that owns this circle -- the field the third-party overview shows and this page did
  // not. Ownership decides who provisions and upgrades the circle, which is exactly what you want
  // to know before editing one by hand.
  const owningApp = circle.appId
    ? apps?.find((app) => stringGuidsEqual(app.appId, circle.appId ?? undefined))
    : undefined;

  const isSystemCircle =
    stringGuidsEqual(circleId, CONFIRMED_CONNECTIONS_CIRCLE_ID) ||
    stringGuidsEqual(circleId, AUTO_CONNECTIONS_CIRCLE_ID);

  return (
    <>
      <ErrorNotification error={enableCircleError} />
      <ErrorNotification error={disableCircleError} />
      <ErrorNotification error={addMembersError} />
      <ErrorNotification error={removeMembersError} />
      <ErrorNotification error={removeCircleError} />
      <PageMeta
        icon={Circles}
        title={`${circle.name}`}
        actions={
          <>
            <ActionButton type="primary" icon={Pencil} onClick={() => setIsOpenEdit(true)}>
              {t('Edit')}
            </ActionButton>
            {!isSystemCircle && (
              <ActionGroup
                type="secondary"
                size="square"
                icon={Ellipsis}
                options={[
                  {
                    onClick: () => {
                      setIsOpenMemberLookup(true);
                    },
                    label: t('Edit Members'),
                    icon: Persons,
                  },
                  ...(circle.disabled
                    ? [
                        {
                          icon: Trash,
                          onClick: () => removeCircle({ circleId }),
                          confirmOptions: {
                            title: `${t('Remove Circle')} ${circle.name}`,
                            buttonText: t('Remove'),
                            body: t(
                              'Are you sure you want to remove this circle, all members will lose their access provided by the permissions of this circle?'
                            ),
                          },
                          label: t('Delete'),
                        },
                        {
                          icon: Check,
                          onClick: () => {
                            enableCircle({ circleId });
                          },
                          label: t('Enable Circle'),
                        },
                      ]
                    : [
                        {
                          icon: Block,
                          onClick: () => disableCircle({ circleId }),
                          confirmOptions: {
                            title: `${t('Disable Circle')} ${circle.name}`,
                            buttonText: t('Disable'),
                            body: `${t('Are you sure you want to disable this circle')}`,
                          },
                          label: t('Disable Circle'),
                        },
                      ]),
                ]}
              >
                {t('More')}
              </ActionGroup>
            )}
          </>
        }
        breadCrumbs={[
          { href: '/owner/circles', title: 'My Circles' },
          { title: circle.name ?? '' },
        ]}
      />
      {circle.disabled && (
        <Alert type="critical" title={t('Circle is disabled')} className="mb-5">
          {t(
            'This circle is disabled, all members no longer have the access provided by this cirlce'
          )}
        </Alert>
      )}

      {isSystemCircle || circle.description ? (
        <section>
          <div className="mr-auto max-w-2xl">
            {isSystemCircle
              ? t('This is a built-in circle. You cannot edit it.')
              : circle.description}
          </div>
        </section>
      ) : null}

      <Section title={t('Details')}>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
          <Fact label={t('Owned by')} hint={OWNERSHIP_HINTS.ownedBy}>
            {circle.appId ? (
              owningApp ? (
                <Link
                  to={`/owner/third-parties/apps/${encodeURIComponent(owningApp.appId)}`}
                  className="hover:underline"
                >
                  {owningApp.name}
                </Link>
              ) : (
                <span className="break-all font-mono">{circle.appId}</span>
              )
            ) : (
              t('You (not owned by an app)')
            )}
          </Fact>

          {/* Only served by hosts that have these columns, so each is shown when present rather
              than defaulted to something the host never sent. */}
          {circle.designation !== undefined ? (
            <Fact label={t('Designation')} hint={OWNERSHIP_HINTS.designation}>
              {t(CircleDesignation[circle.designation] ?? `${circle.designation}`)}
            </Fact>
          ) : null}

          {circle.grantOn !== undefined ? (
            <Fact label={t('Granted on')} hint={OWNERSHIP_HINTS.grantOn}>
              {t(CircleGrantOn[circle.grantOn] ?? `${circle.grantOn}`)}
            </Fact>
          ) : null}

          <Fact label={t('Enabled')}>{circle.disabled ? t('No') : t('Yes')}</Fact>

          {circle.created ? (
            <Fact label={t('Created')}>{formatTimestamp(circle.created)}</Fact>
          ) : null}
          {circle.lastUpdated ? (
            <Fact label={t('Last updated')}>{formatTimestamp(circle.lastUpdated)}</Fact>
          ) : null}

          <Fact label={t('Id')}>
            <span className="break-all font-mono text-slate-400">{circleId}</span>
          </Fact>
        </dl>
      </Section>

      <SectionTitle
        title={t('Members')}
        actions={
          !isSystemCircle && (
            <ActionButton type="mute" onClick={() => setIsOpenMemberLookup(true)} icon={Pencil} />
          )
        }
      />
      <div className="py-5">
        {members?.length && !membersLoading ? (
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10">
            {members.map((member) => (
              <CircleMemberCard
                key={member.domain}
                circleId={decodedCircleKey}
                member={member}
                className="min-w-[5rem]"
                isEditable={!isSystemCircle}
              />
            ))}
          </div>
        ) : !isSystemCircle ? (
          <SubtleMessage className="flex flex-row items-center">
            <span>{t('Ready to add some connections?')}</span>
            <ActionButton
              onClick={() => setIsOpenMemberLookup(true)}
              type="secondary"
              className="ml-2"
              icon={Plus}
            >
              {t('Add')}
            </ActionButton>
          </SubtleMessage>
        ) : (
          <SubtleMessage className="flex flex-row items-center">{t('No members')}</SubtleMessage>
        )}
      </div>

      <Section
        title={
          <>
            {t('Apps that')} &quot;{circle.name}&quot; {t('can use')}
            <small className="block text-sm text-slate-500">
              {t('all contacts added will have this access')}
            </small>
          </>
        }
        actions={
          <ActionButton
            type="mute"
            onClick={() => setIsOpenAppInteractionDialog(true)}
            icon={Pencil}
          />
        }
      >
        <AppInteractionPermissionOverview
          circleId={circle.id}
          fallbackMessage={<>{t("This circle doesn't have any access to any apps")}</>}
        />
      </Section>

      <Section
        title={
          <>
            {t('Access on the following drives')}
            <small className="block text-sm text-slate-500">
              {t('all contacts added will have this access')}
            </small>
          </>
        }
        actions={
          !isSystemCircle && (
            <ActionButton type="mute" onClick={() => setIsDrivesEditOpen(true)} icon={Pencil} />
          )
        }
      >
        {circle.driveGrants?.length ? (
          <div className="-my-6">
            {circle.driveGrants.map((grant) => {
              return (
                <DrivePermissionView
                  key={`${grant.permissionedDrive.drive.alias}-${grant.permissionedDrive.drive.type}`}
                  driveGrant={grant}
                  className="my-6"
                />
              );
            })}
          </div>
        ) : (
          <div className="flex flex-row">
            <p className="my-auto">{t("This circle doesn't have any access")}</p>
          </div>
        )}
      </Section>

      <CircleDialog
        title={`${t('Edit')}: ${circle.name}`}
        isOpen={isOpenEdit}
        confirmText={t('Update Circle')}
        defaultValue={circle}
        onCancel={() => setIsOpenEdit(false)}
        onConfirm={() => setIsOpenEdit(false)}
        permissionEditOnly={isSystemCircle}
      />
      <MemberLookupDialog
        isOpen={isOpenMemberLookup}
        title={`${t('Add Members to')} "${circle.name}"`}
        defaultMembers={members?.map((member) => member.domain) || []}
        onCancel={() => {
          setIsOpenMemberLookup(false);
        }}
        confirmationStatus={mergeStates(addMemberStatus, removeMemberStatus)}
        onConfirm={async (toProvideMembers, toRevokeMembers) => {
          await addMembers({ circleId: decodedCircleKey, odinIds: toProvideMembers });
          await removeMembers({ circleId: decodedCircleKey, odinIds: toRevokeMembers });

          setIsOpenMemberLookup(false);
        }}
      />
      <CircleAppInteractionDialog
        isOpen={isOpenAppInteractionDialog}
        title={t('Edit accessible apps')}
        circleDef={circle}
        onConfirm={() => setIsOpenAppInteractionDialog(false)}
        onCancel={() => setIsOpenAppInteractionDialog(false)}
      />
      <DrivePermissionSelectorDialog
        title={`${t('Edit drive access of')} "${circle.name}"`}
        defaultValue={circle.driveGrants || []}
        error={updateCircleError}
        confirmState={updateCircleStatus}
        isOpen={isDrivesEditOpen}
        onCancel={() => setIsDrivesEditOpen(false)}
        onConfirm={async (newDriveGrants) => {
          await updateCircle({ ...circle, driveGrants: newDriveGrants });
          setIsDrivesEditOpen(false);
        }}
      />
    </>
  );
};

const CircleMemberCard = ({
  circleId,
  member,
  className,
  isEditable,
}: {
  circleId: string;
  member: Membership;
  className: string;
  isEditable: boolean;
}) => {
  const {
    mutate: revokeGrants,
    status: revokeGrantsStatus,
    error: revokeGrantsError,
  } = useCircle().revokeIdentityGrants;

  const {
    mutate: revokeDomainGrants,
    status: revokeDomainGrantsStatus,
    error: revokeDomainGrantsError,
  } = useCircle().revokeDomainGrants;

  if (member.domainType === 'youAuth') {
    return (
      <>
        <ErrorNotification error={revokeDomainGrantsError} />
        <DomainCard
          domain={member.domain}
          className={`${className ?? ''} group relative`}
          href={(member.domain && `/owner/third-parties/services/${member.domain}`) ?? undefined}
        >
          {isEditable ? (
            <div className="absolute right-2 top-2 z-10 aspect-square rounded-full">
              <ActionButton
                type="secondary"
                onClick={(e) => {
                  e.preventDefault();
                  revokeDomainGrants({ circleId, domains: [member.domain] });
                  return false;
                }}
                confirmOptions={{
                  type: 'info',
                  title: t('Remove member'),
                  body: `${t('Are you sure you want to remove')} ${member.domain} ${t(
                    'from this circle?'
                  )}`,
                  buttonText: t('Remove'),
                }}
                state={revokeDomainGrantsStatus}
                icon={Times}
                className="rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                size="square"
              />
            </div>
          ) : null}
        </DomainCard>
      </>
    );
  }

  const odinId = member.domain;
  return (
    <>
      <ErrorNotification error={revokeGrantsError} />
      <ConnectionCard
        className={`${className ?? ''} group relative`}
        odinId={odinId}
        href={(odinId && `/owner/connections/${odinId}`) ?? undefined}
        canSave={true}
      >
        {isEditable ? (
          <div className="absolute right-2 top-2 z-10 aspect-square rounded-full">
            <ActionButton
              type="secondary"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                revokeGrants({ circleId, odinIds: [odinId] });
                return false;
              }}
              confirmOptions={{
                type: 'info',
                title: t('Remove member'),
                body: `${t('Are you sure you want to remove')} ${odinId} ${t('from this circle?')}`,
                buttonText: t('Remove'),
              }}
              state={revokeGrantsStatus}
              icon={Times}
              className="rounded-full opacity-0 transition-opacity group-hover:opacity-100"
              size="square"
            />
          </div>
        ) : null}
      </ConnectionCard>
    </>
  );
};

export default CircleDetails;
