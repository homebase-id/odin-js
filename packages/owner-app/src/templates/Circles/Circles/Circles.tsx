import { BuiltInProfiles, GetTargetDriveFromProfileId } from '@youfoundation/js-lib/profile';
import { useState } from 'react';
import { Plus, SubtleMessage, t } from '@youfoundation/common-app';
import { useCircles } from '@youfoundation/common-app';
import { Circles as CirclesIcon } from '@youfoundation/common-app';
import { ActionButton } from '@youfoundation/common-app';

import { LoadingBlock } from '@youfoundation/common-app';
import CardLink from '../../../components/ui/Buttons/CardLink';
import { useCircle } from '@youfoundation/common-app';
import { Ellipsis } from '@youfoundation/common-app';
import { PageMeta } from '../../../components/ui/PageMeta/PageMeta';
import { ALL_CONNECTIONS_CIRCLE_ID, CircleDefinition } from '@youfoundation/js-lib/network';
import ContactImage from '../../../components/Connection/ContactImage/ContactImage';
import { CompanyImage } from '../../../components/Connection/CompanyImage/CompanyImage';
import { DrivePermissionType } from '@youfoundation/js-lib/core';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import CircleDialog from '../../../components/Circles/CircleDialog/CircleDialog';

const Circles = () => {
  const {
    fetch: { data: circles, isLoading: isCirclesLoading },
  } = useCircles();

  const [isOpenCreate, setIsOpenCreate] = useState(false);

  return (
    <>
      <PageMeta
        icon={CirclesIcon}
        title={t('My Circles')}
        actions={
          <ActionButton icon={Plus} onClick={() => setIsOpenCreate(true)}>
            {t('Add Circle')}
          </ActionButton>
        }
      />

      <section className="">
        {isCirclesLoading ? (
          <>
            <LoadingBlock className="mb-4 h-10" />
            <LoadingBlock className="mb-4 h-10" />
            <LoadingBlock className="mb-4 h-10" />
          </>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {circles?.length ? (
              circles.map((circleDef) => (
                <CircleCardLink key={circleDef.id} circleDef={circleDef} />
              ))
            ) : (
              <SubtleMessage>{t('No circles found')}</SubtleMessage>
            )}
          </div>
        )}
      </section>

      <CircleDialog
        title={t('Create new Circle')}
        isOpen={isOpenCreate}
        defaultValue={{
          name: '',
          description: '',
          driveGrants: [
            {
              permissionedDrive: {
                drive: GetTargetDriveFromProfileId(BuiltInProfiles.StandardProfileId),
                permission: [DrivePermissionType.Read],
              },
            },
          ],
          permissions: {
            keys: [10],
          },
        }}
        onConfirm={() => {
          setIsOpenCreate(false);
        }}
        onCancel={() => {
          setIsOpenCreate(false);
        }}
      />
    </>
  );
};

const CircleCardLink = ({ circleDef }: { circleDef: CircleDefinition }) => {
  const { data: members } = useCircle({ circleId: circleDef.id }).fetchMembers;
  const isSystemCircle = stringGuidsEqual(circleDef.id, ALL_CONNECTIONS_CIRCLE_ID);

  return (
    <CardLink
      key={circleDef.id}
      title={
        <span className="flex w-full flex-row items-center">
          <span>{circleDef.name}</span>
          {members?.length ? (
            <>
              <div className="ml-auto mt-auto flex shrink-0 flex-row">
                {members
                  ?.slice(0, 5)
                  ?.map((member) =>
                    member.domainType === 'identity' ? (
                      <ContactImage
                        odinId={member.domain}
                        key={member.domain}
                        className="-mr-2 h-7 w-7 overflow-hidden rounded-full border last:mr-0 dark:border-slate-500"
                        fallbackSize="xs"
                        canSave={true}
                      />
                    ) : (
                      <CompanyImage
                        domain={member.domain}
                        key={member.domain}
                        className="-mr-2 h-7 w-7 overflow-hidden rounded-full border last:mr-0 dark:border-slate-500"
                        fallbackSize="xs"
                      />
                    )
                  )}
              </div>
              {members.length > 5 ? (
                <span className="mb-1 mt-auto pl-2 text-slate-400">
                  <Ellipsis className="h-5 w-5" />
                </span>
              ) : (
                ''
              )}
            </>
          ) : null}
        </span>
      }
      description={
        isSystemCircle
          ? t('This is a built-in circle, that contains all your connections.')
          : circleDef.description
      }
      isDisabled={circleDef.disabled}
      href={`/owner/circles/${circleDef.id ? encodeURIComponent(circleDef.id) : ''}`}
    />
  );
};

export default Circles;
