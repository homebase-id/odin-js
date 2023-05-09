import {
  BuiltInProfiles,
  CircleDefinition,
  GetTargetDriveFromProfileId,
} from '@youfoundation/js-lib';
import { useState } from 'react';
import { t } from '@youfoundation/common-app';
import useCircles from '../../../hooks/circles/useCircles';
import { Circles as CirclesIcon } from '@youfoundation/common-app';
import ActionButton from '../../../components/ui/Buttons/ActionButton';
import CircleDialog from '../../../components/Dialog/CircleDialog/CircleDialog';
import PageMeta from '../../../components/ui/Layout/PageMeta/PageMeta';
import { LoadingParagraph } from '@youfoundation/common-app';
import CardLink from '../../../components/ui/Buttons/CardLink';
import useCircle from '../../../hooks/circles/useCircle';
import { Ellipsis } from '@youfoundation/common-app';

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
          <>
            <ActionButton icon="plus" onClick={() => setIsOpenCreate(true)}>
              {t('Add Circle')}
            </ActionButton>
          </>
        }
      />

      <section className="">
        {isCirclesLoading ? (
          <>
            <LoadingParagraph className="mb-4 h-10" />
            <LoadingParagraph className="mb-4 h-10" />
            <LoadingParagraph className="mb-4 h-10" />
          </>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {circles?.length ? (
              circles.map((circleDef) => (
                <CircleCardLink key={circleDef.id} circleDef={circleDef} />
              ))
            ) : (
              <>{t('No circles found')}</>
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
                permission: 4,
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

  return (
    <CardLink
      key={circleDef.id}
      title={
        <span className="flex w-full flex-row items-center">
          <span>{circleDef.name}</span>
          {members?.length ? (
            <>
              <div className="ml-auto mt-auto flex shrink-0 flex-row pt-2">
                {members?.slice(0, 5)?.map((member) => (
                  <img
                    src={`https://${member}/pub/image`}
                    className="-mr-2 h-8 w-8 rounded-full last:mr-0"
                    key={member}
                  />
                ))}
              </div>
              {members.length > 5 ? (
                <span className="mb-1 mt-auto pl-2 text-slate-400">
                  <Ellipsis className="h-4 w-4" />
                </span>
              ) : (
                ''
              )}
            </>
          ) : null}
        </span>
      }
      description={circleDef.description}
      isDisabled={circleDef.disabled}
      href={`/owner/circles/${circleDef.id ? encodeURIComponent(circleDef.id) : ''}`}
    />
  );
};

export default Circles;
