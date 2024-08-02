import { useNavigate, useSearchParams } from 'react-router-dom';

import {
  ActionButton,
  Arrow,
  ConnectionImage,
  ConnectionName,
  ErrorBoundary,
  Input,
  Label,
  Radio,
  t,
  Times,
  useAllContacts,
  useDotYouClient,
} from '@youfoundation/common-app';
import { CommunityDefinition } from '../../providers/CommunityDefinitionProvider';
import { NewHomebaseFile, SecurityGroupType } from '@youfoundation/js-lib/core';
import { getNewId, tryJsonParse } from '@youfoundation/js-lib/helpers';
import { useEffect, useState } from 'react';
import { ContactFile } from '@youfoundation/js-lib/network';
import { useCommunity } from '../../hooks/community/useCommunity';
import { ROOT_PATH as COMMUNITY_ROOT } from '../../app/App';

export const NewCommunity = () => {
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
        className="flex h-full w-full items-center justify-center p-5"
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
                  className="mb-5 flex flex-row items-center gap-1 rounded-lg bg-primary/20 px-1 py-1"
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

            <div className="mb-5 flex flex-col gap-2">
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
