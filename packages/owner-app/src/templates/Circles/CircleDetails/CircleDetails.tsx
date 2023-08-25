import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Pencil, Plus, SubtleMessage, Times, t } from '@youfoundation/common-app';
import { useCircle } from '@youfoundation/common-app';
import { Alert } from '@youfoundation/common-app';
import { ErrorNotification, mergeStates, ActionButton } from '@youfoundation/common-app';
import ConnectionCard from '../../../components/Connection/ConnectionCard/ConnectionCard';
import CircleDialog from '../../../components/Dialog/CircleDialog/CircleDialog';
import MemberLookupDialog from '../../../components/Dialog/MemberLookupDialog/MemberLookupDialog';
import { Circles } from '@youfoundation/common-app';
import LoadingDetailPage from '../../../components/ui/Loaders/LoadingDetailPage/LoadingDetailPage';
import DrivePermissionView from '../../../components/PermissionViews/DrivePermissionView/DrivePermissionView';
import Section, { SectionTitle } from '../../../components/ui/Sections/Section';
import { ActionGroup } from '@youfoundation/common-app';
import { Persons } from '@youfoundation/common-app';
import { Trash } from '@youfoundation/common-app';
import { Block } from '@youfoundation/common-app';
import { Check } from '@youfoundation/common-app';
import { AppInteractionPermissionOverview } from '../../../components/PermissionViews/AppInteractionPermissionView/AppInteractionPermissionView';
import CircleAppInteractionDialog from '../../../components/Dialog/CircleAppInteractionDialog/CircleAppInteractionDialog';
import DrivePermissionSelectorDialog from '../../../components/Dialog/DrivePermissionSelectorDialog/DrivePermissionSelectorDialog';
import { PageMeta } from '../../../components/ui/PageMeta/PageMeta';
import { Membership } from '@youfoundation/js-lib/network';
import DomainCard from '../../../components/Connection/DomainCard/DomainCard';

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

  const [isOpenEdit, setIsOpenEdit] = useState(false);
  const [isOpenMemberLookup, setIsOpenMemberLookup] = useState(false);
  const [isOpenAppInteractionDialog, setIsOpenAppInteractionDialog] = useState(false);
  const [isDrivesEditOpen, setIsDrivesEditOpen] = useState(false);

  if (circleLoading) {
    return <LoadingDetailPage />;
  }

  if (!circle || !circle.id || !decodedCircleKey) {
    return <>{t('No matching circle found')}</>;
  }

  const circleId = circle.id;

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
            <ActionButton
              type="primary"
              icon={Pencil}
              onClick={() => {
                setIsOpenEdit(true);
              }}
            >
              {t('Edit Circle')}
            </ActionButton>
            <ActionGroup
              type="secondary"
              size="square"
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
              ...
            </ActionGroup>
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

      <section>
        <div className="mr-auto max-w-2xl">{circle.description}</div>
      </section>

      <SectionTitle
        title={t('Members')}
        actions={
          <ActionButton type="mute" onClick={() => setIsOpenMemberLookup(true)} icon={Pencil} />
        }
      />
      <div className="py-5">
        {members?.length && !membersLoading ? (
          <div className="-m-1 flex flex-row flex-wrap">
            {members.map((member) => (
              <CircleMemberCard
                key={member.domain}
                circleId={decodedCircleKey}
                member={member}
                className="w-1/2 p-1 sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/6"
              />
            ))}
          </div>
        ) : (
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
          <ActionButton type="mute" onClick={() => setIsDrivesEditOpen(true)} icon={Pencil} />
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
        onCancel={() => {
          setIsOpenEdit(false);
        }}
        onConfirm={() => {
          setIsOpenEdit(false);
        }}
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
}: {
  circleId: string;
  member: Membership;
  className: string;
}) => {
  const {
    mutate: revokeGrants,
    status: revokeGrantsStatus,
    error: revokeGrantsError,
  } = useCircle({}).revokeIdentityGrants;

  const {
    mutate: revokeDomainGrants,
    status: revokeDomainGrantsStatus,
    error: revokeDomainGrantsError,
  } = useCircle({}).revokeDomainGrants;

  if (member.domainType === 'youAuth') {
    return (
      <>
        <ErrorNotification error={revokeDomainGrantsError} />
        <DomainCard
          domain={member.domain}
          className={`${className ?? ''} group relative`}
          href={(member.domain && `/owner/third-parties/${member.domain}`) ?? undefined}
        >
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
      >
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
      </ConnectionCard>
    </>
  );
};

export default CircleDetails;
