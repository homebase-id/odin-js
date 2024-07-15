import { useNavigate, useParams, useMatch, useSearchParams } from 'react-router-dom';

import { CommunityDetail } from './CommunityDetail';

import { ROOT_PATH } from '../../app/App';
import {
  ActionButton,
  ActionLink,
  Arrow,
  COMMUNITY_APP_ID,
  ConnectionImage,
  ConnectionName,
  ErrorBoundary,
  ExtendPermissionDialog,
  Input,
  Label,
  Plus,
  Radio,
  RadioTower,
  Sidenav,
  t,
  Times,
  useAllContacts,
  useDotYouClient,
  useRemoveNotifications,
} from '@youfoundation/common-app';
import { drives, permissions } from '../../hooks/auth/useAuth';
import { Helmet } from 'react-helmet-async';
import { CommunityDefinition } from '../../providers/CommunityDefinitionProvider';
import { HomebaseFile, NewHomebaseFile, SecurityGroupType } from '@youfoundation/js-lib/core';
import { getNewId, stringGuidsEqual, tryJsonParse } from '@youfoundation/js-lib/helpers';
import { useCommunities } from '../../hooks/community/useCommunities';
import { useEffect, useState } from 'react';
import { ContactFile } from '@youfoundation/js-lib/network';
import { useCommunity } from '../../hooks/community/useCommunity';

export const COMMUNITY_ROOT = ROOT_PATH;

export const CommunityHome = () => {
  const { communityKey } = useParams();

  const newCommunity = useMatch({ path: `${COMMUNITY_ROOT}/new` });
  const isCreateNew = !!newCommunity;

  // const isOnline = useLiveCommunityProcessor(); // => Probablay move to CommunityDetail as it needs to connect on different drives
  useRemoveNotifications({ appId: COMMUNITY_APP_ID });

  return (
    <>
      <Helmet>
        <title>Homebase | Community</title>
      </Helmet>

      <ExtendPermissionDialog
        appName={t('Homebase Community')}
        appId={COMMUNITY_APP_ID}
        drives={drives}
        permissions={permissions}
        // needsAllConnected={true}
      />
      <div className={`flex h-[100dvh] w-full flex-row overflow-hidden`}>
        <CommunitySideNav isOnline={false} />
        <div className="h-full w-full flex-grow bg-background">
          {isCreateNew ? <NewCommunity /> : <CommunityDetail conversationId={communityKey} />}
        </div>
      </div>
    </>
  );
};

const CommunitySideNav = ({ isOnline }: { isOnline: boolean }) => {
  const { communityKey } = useParams();

  const rootChatMatch = useMatch({ path: COMMUNITY_ROOT });
  const isRoot = !!rootChatMatch;

  return (
    <>
      <Sidenav disablePinning={true} hideMobileDrawer={!isRoot} />
      <div
        className={`flex h-[100dvh] w-full flex-shrink-0 flex-col border-r bg-page-background dark:border-r-slate-800 md:max-w-[4rem]`}
      >
        <ErrorBoundary>
          <CommunitiesSidebar activeCommunityId={communityKey} />
        </ErrorBoundary>
      </div>
    </>
  );
};

export const CommunitiesSidebar = ({
  activeCommunityId,
}: {
  activeCommunityId: string | undefined;
}) => {
  const { data: communities } = useCommunities().all;

  return (
    <ErrorBoundary>
      <div className="flex flex-grow flex-col items-center gap-2 px-2">
        <ActionLink href={COMMUNITY_ROOT} type="mute" size={'none'} className="px-2 pb-0 pt-4">
          <RadioTower className="h-8 w-8" />
        </ActionLink>
        <CommunitiesList
          communities={
            communities?.filter(
              (community) =>
                community.fileMetadata.appData.archivalStatus !== 2 ||
                community.fileMetadata.appData.uniqueId === activeCommunityId
            ) || []
          }
          activeCommunityId={activeCommunityId}
        />
      </div>
    </ErrorBoundary>
  );
};

const CommunitiesList = ({
  communities,
  activeCommunityId,
}: {
  communities: HomebaseFile<CommunityDefinition>[];
  activeCommunityId: string | undefined;
}) => {
  return (
    <>
      {communities?.map((conversation) => (
        <CommunityListItem
          key={conversation.fileId}
          community={conversation}
          isActive={stringGuidsEqual(activeCommunityId, conversation.fileMetadata.appData.uniqueId)}
        />
      ))}

      <ActionLink
        href={`${COMMUNITY_ROOT}/new`}
        type={communities?.length ? 'secondary' : 'primary'}
        size={'none'}
        className="flex aspect-square w-full items-center justify-center rounded-2xl hover:shadow-md"
      >
        <Plus className="h-8 w-8" />
      </ActionLink>
    </>
  );
};

const CommunityListItem = ({
  community,
  isActive,
}: {
  community: HomebaseFile<CommunityDefinition>;
  isActive: boolean;
}) => {
  return (
    <ActionLink
      href={`${COMMUNITY_ROOT}/${community.fileMetadata.appData.uniqueId}`}
      className="aspect-square w-full rounded-2xl p-4 uppercase hover:shadow-md"
    >
      {community.fileMetadata.appData.content.title.slice(0, 2)}
    </ActionLink>
  );
};

const NewCommunity = () => {
  const [query, setQuery] = useState<string | undefined>(undefined);
  const identity = useDotYouClient().getIdentity();

  const [newRecipients, setNewRecipients] = useState<ContactFile[]>([]);
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
        navigate(`${COMMUNITY_ROOT}/${definitionFile.fileMetadata.appData.uniqueId}`);
      })();
    }
  }, [pendingDefinition]);

  const { data: contacts } = useAllContacts(true);
  const contactResults = contacts
    ? contacts
        .map((dsr) => dsr.fileMetadata.appData.content)
        .filter(
          (contact) =>
            contact.odinId &&
            (!query ||
              contact.odinId?.includes(query) ||
              contact.name?.displayName?.includes(query))
        )
    : [];

  const { mutateAsync: createNew, status: createStatus } = useCommunity().save;
  const doCreate = async () => {
    const recipients = newRecipients.map((x) => x.odinId).filter(Boolean) as string[];
    if (!identity || !recipients?.length || !groupTitle) return;
    try {
      const communityId = getNewId();

      const newCommunityDef: NewHomebaseFile<CommunityDefinition> = {
        fileMetadata: {
          appData: {
            content: {
              title: groupTitle,
              recipients: [...recipients, identity],
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

      await createNew(newCommunityDef); // Will redirect to an ensure drive
      navigate(`${COMMUNITY_ROOT}/${communityId}`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <ErrorBoundary>
      <form
        className="flex h-full items-center justify-center"
        onSubmit={(e) => {
          e.preventDefault();
          doCreate();
        }}
      >
        <div className="w-full max-w-lg">
          <h2 className="mb-5 text-3xl">{t('New Community')}</h2>

          <div className="mb-4">
            <Label>{t('Name')} </Label>
            <Input
              onChange={(e) => setGroupTitle(e.target.value)}
              defaultValue={groupTitle}
              required
            />
          </div>
          <div>
            <Label>{t('Members')} </Label>
            <div className="flex flex-row flex-wrap gap-2">
              {newRecipients.map((recipient, index) => (
                <div
                  className="flex flex-row items-center gap-1 rounded-lg bg-primary/20 px-1 py-1"
                  key={recipient.odinId || index}
                >
                  <ConnectionImage odinId={recipient.odinId} size="xs" />
                  <ConnectionName odinId={recipient.odinId} />
                  <ActionButton
                    icon={Times}
                    type="mute"
                    onClick={() =>
                      setNewRecipients(newRecipients.filter((x) => x.odinId !== recipient.odinId))
                    }
                  />
                </div>
              ))}
            </div>

            <div className="my-5 flex flex-col gap-2">
              <Input
                onChange={(e) => {
                  e.preventDefault();
                  setQuery(e.target.value);
                }}
                defaultValue={query}
                className="w-full"
                placeholder={t('Search for contacts')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
              />

              <div className="flex flex-grow flex-col gap-2 overflow-auto">
                {contactResults.map((result, index) => {
                  const isActive = newRecipients.some((x) => x.odinId === result.odinId);

                  return (
                    <SingleConversationItem
                      odinId={result.odinId as string}
                      isActive={isActive}
                      key={result.odinId || index}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (isActive) {
                          setNewRecipients([
                            ...newRecipients.filter((x) => x.odinId !== result.odinId),
                          ]);
                        } else {
                          setNewRecipients([
                            ...newRecipients.filter((x) => x.odinId !== result.odinId),
                            result,
                          ]);
                        }
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-row-reverse">
            <ActionButton icon={Arrow} state={createStatus}>
              {t('Create')}
            </ActionButton>
          </div>
        </div>
      </form>
    </ErrorBoundary>
  );
};

export const SingleConversationItem = ({
  odinId,
  onClick,
  isActive,
}: {
  onClick: React.MouseEventHandler<HTMLButtonElement> | undefined;
  odinId: string | undefined;

  isActive: boolean;
}) => {
  return (
    <button
      onClick={onClick}
      className={`flex w-full flex-row items-center gap-3 ${isActive ? 'opacity-40' : ''}`}
    >
      <Radio readOnly={true} checked={isActive} />
      <ConnectionImage
        odinId={odinId}
        className="border border-neutral-200 dark:border-neutral-800"
        size="sm"
      />
      <div className="flex flex-col items-start">
        <ConnectionName odinId={odinId} />
        <span className="text-sm text-slate-400">{odinId}</span>
      </div>
    </button>
  );
};
