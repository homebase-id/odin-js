import { useNavigate, useSearchParams } from 'react-router-dom';

import {
  ActionButton,
  COMMUNITY_ROOT_PATH,
  ActionLink,
  AuthorImage,
  ErrorBoundary,
  Input,
  Label,
  Radio,
  t,
  useCircle,
  useCircles,
  useDotYouClient,
} from '@homebase-id/common-app';
import { CommunityDefinition } from '../../providers/CommunityDefinitionProvider';
import { NewHomebaseFile, SecurityGroupType } from '@homebase-id/js-lib/core';
import { getNewId, stringGuidsEqual, tryJsonParse } from '@homebase-id/js-lib/helpers';
import { useState } from 'react';
import { CircleDefinition } from '@homebase-id/js-lib/network';
import { useCommunity } from '../../hooks/community/useCommunity';
import { Ellipsis, Arrow } from '@homebase-id/common-app/icons';
import { useEffect } from 'react';

export const NewCommunity = () => {
  const identity = useDotYouClient().getIdentity();
  const { data: circles } = useCircles(true).fetch;

  const [selectedCircle, setSelectedCircle] = useState<{
    circle: CircleDefinition;
    members: string[];
  }>();
  const [groupTitle, setGroupTitle] = useState<string>();

  const [searchParams] = useSearchParams();
  const pendingDefinition = searchParams.get('draft');

  const navigate = useNavigate();

  useEffect(() => {
    if (pendingDefinition) {
      const definitionFile = tryJsonParse<NewHomebaseFile<CommunityDefinition>>(pendingDefinition);
      if (!definitionFile) return;
      (async () => {
        await createNew(definitionFile);
        navigate(
          `${COMMUNITY_ROOT_PATH}/${identity}/${definitionFile.fileMetadata.appData.uniqueId}`
        );
      })();
    }
  }, [pendingDefinition]);

  const { mutateAsync: createNew, status: createStatus } = useCommunity().save;
  const doCreate = async () => {
    if (!selectedCircle || !selectedCircle.circle.id || !groupTitle || !identity) return;

    try {
      const communityId = getNewId();
      const newCommunityDef: NewHomebaseFile<CommunityDefinition> = {
        fileMetadata: {
          appData: {
            content: {
              title: groupTitle,
              members: [...selectedCircle.members, identity],
              acl: {
                requiredSecurityGroup: SecurityGroupType.Connected,
                circleIdList: [selectedCircle.circle.id],
              },
            },
            uniqueId: communityId,
          },
        },
        serverMetadata: {
          accessControlList: {
            requiredSecurityGroup: SecurityGroupType.Owner,
          },
        },
      };
      await createNew(newCommunityDef); // Will in 99% of the cases first redirect to an ensure drive
      navigate(`${COMMUNITY_ROOT_PATH}/${identity}/${communityId}`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <ErrorBoundary>
      <form
        className="flex h-full w-full items-center justify-center p-5"
        onSubmit={(e) => {
          e.preventDefault();
          doCreate();
        }}
      >
        <div className="w-full max-w-lg">
          <h2 className="mb-5 text-3xl">
            {t('New Community')}
            <small className="block text-sm font-normal text-slate-400">
              {t(
                'Provides an easy way of communitication between a group of inviduals. Contrary to the rest of Homebase a community has their data stored centrally on a single identity.'
              )}
            </small>
          </h2>

          <div className="mb-4">
            <Label>{t('Name')} </Label>
            <Input
              onChange={(e) => setGroupTitle(e.target.value)}
              defaultValue={groupTitle}
              required
            />
          </div>
          <div>
            <Label>
              {t('Members')}
              <small className="block text-sm font-normal text-slate-400">
                {t(
                  'The members of a community always match a circle to provide easy management of access to the centralized data stored on your identity'
                )}
              </small>
            </Label>
            <div className="flex flex-col gap-2">
              {circles?.map((circle) => (
                <CircleOption
                  circle={circle}
                  onSelect={(circle, members) => {
                    setSelectedCircle({ circle, members });
                  }}
                  isActive={stringGuidsEqual(selectedCircle?.circle.id, circle.id)}
                  key={circle.id}
                />
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-col justify-between gap-2 sm:flex-row-reverse">
            <ActionButton icon={Arrow} state={createStatus}>
              {t('Create')}
            </ActionButton>

            <ActionLink type="secondary" onClick={() => navigate(-1)}>
              {t('Cancel')}
            </ActionLink>
          </div>
        </div>
      </form>
    </ErrorBoundary>
  );
};

export const CircleOption = ({
  circle,
  onSelect,
  isActive,
}: {
  onSelect: (circle: CircleDefinition, members: string[]) => void;
  circle: CircleDefinition;

  isActive: boolean;
}) => {
  const { data: members } = useCircle({ circleId: circle.id }).fetchMembers;

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect(
          circle,
          (members || []).map((x) => x.domain)
        );
      }}
      className={`flex w-full flex-row items-center gap-3 rounded-lg bg-background px-3 py-3 hover:shadow-md ${isActive ? 'bg-primary/20' : ''}`}
    >
      <Radio readOnly={true} checked={isActive} key={`${circle.id}_${isActive}}`} />

      <div className="flex w-full flex-row items-center">
        <p>{circle.name}</p>

        {members?.length ? (
          <>
            <div className="ml-auto mt-auto flex shrink-0 flex-row">
              {members
                ?.slice(0, 5)
                ?.map((member) => (
                  <AuthorImage
                    odinId={member.domain}
                    key={member.domain}
                    className="-mr-2 h-7 w-7 overflow-hidden rounded-full border last:mr-0 dark:border-slate-500"
                    excludeLink={true}
                  />
                ))}
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
      </div>
    </button>
  );
};
