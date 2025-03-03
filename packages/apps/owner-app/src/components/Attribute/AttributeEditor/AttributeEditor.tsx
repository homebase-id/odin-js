import { useEffect, useRef, useState } from 'react';
import {
  AclIcon,
  AclSummary,
  AclWizard,
  ActionGroupOptionProps,
  ErrorBoundary,
  SaveStatus,
  t,
  useDebounce,
} from '@homebase-id/common-app';
import { useAttribute } from '../../../hooks/profiles/useAttribute';
import { AttributeVm } from '../../../hooks/profiles/useAttributes';
import { ActionButton } from '@homebase-id/common-app';

import Section from '../../ui/Sections/Section';
import AttributeFields from '../AttributeFields/AttributeFields';
import { ActionGroup } from '@homebase-id/common-app';
import { Trash, Shield, Times, ArrowDown, ArrowUp } from '@homebase-id/common-app/icons';
import { HomePageAttributes } from '@homebase-id/js-lib/public';
import {
  HomebaseFile,
  EmbeddedThumb,
  NewHomebaseFile,
  SecurityGroupType,
  AccessControlList,
} from '@homebase-id/js-lib/core';
import { OptionalACLHomebaseFile } from '../AttributeCreator/AttributeCreator';
import { BuiltInAttributes } from '@homebase-id/js-lib/profile';

const AttributeEditor = ({
  attribute: attributeDsr,
  className,
  orderAttrUp,
  orderAttrDown,
  title,
  onCancel,
  onSave: onManualSave,
}: {
  attribute:
    | HomebaseFile<AttributeVm>
    | NewHomebaseFile<AttributeVm>
    | OptionalACLHomebaseFile<AttributeVm>;
  className?: string;
  orderAttrUp?: () => Promise<number | undefined>;
  orderAttrDown?: () => Promise<number | undefined>;
  title?: string;
  onCancel?: () => void;
  onSave?: () => void;
}) => {
  const attribute = attributeDsr.fileMetadata.appData.content;
  const isNewAttribute = !attributeDsr.fileId;
  const {
    save: { data: updatedAttr, mutate: saveAttr, status: saveStatus, error: saveError },
    remove: { mutate: removeAttr },
  } = useAttribute();

  // Local state of the changes
  const [latestAttr, setLatestAttr] = useState<NewHomebaseFile<AttributeVm>>({
    ...attributeDsr,
    ...updatedAttr,
    serverMetadata: {
      accessControlList:
        updatedAttr?.serverMetadata?.accessControlList ||
        attributeDsr?.serverMetadata?.accessControlList ||
        getDefaultAcl(attribute.type),
    },
    fileMetadata: {
      ...attributeDsr.fileMetadata,
      ...updatedAttr?.fileMetadata,
      appData: {
        ...attributeDsr.fileMetadata.appData,
        ...updatedAttr?.fileMetadata.appData,
        content: {
          ...attributeDsr.fileMetadata.appData.content,
          ...updatedAttr?.fileMetadata.appData.content,
        },
      },
    },
  });

  const [isAclEdit, setIsAclEdit] = useState(!attributeDsr.serverMetadata?.accessControlList);
  const [isFadeOut, setIsFadeOut] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const doManualSave = (dirtyAttr: NewHomebaseFile<AttributeVm>) => {
    saveAttr({ ...dirtyAttr });
    if (onManualSave) onManualSave();
  };

  const debouncedSave = useDebounce(() => saveAttr(latestAttr), { timeoutMillis: 2000 });
  const changeHandler = (e: {
    target: { value: unknown; name: string; previewThumbnail?: EmbeddedThumb };
  }) => {
    const dirtyAttr = { ...latestAttr };
    if (!dirtyAttr.fileMetadata.appData.content.data)
      dirtyAttr.fileMetadata.appData.content.data = {};
    dirtyAttr.fileMetadata.appData.content.data[e.target.name] = e.target.value;
    if (e.target.previewThumbnail)
      dirtyAttr.fileMetadata.appData.previewThumbnail = e.target.previewThumbnail;

    setLatestAttr(dirtyAttr);

    if (!isNewAttribute) debouncedSave();
  };

  const reorder = async (dir: 1 | -1) => {
    if (isNewAttribute) return;
    let newPriority;

    if (dir === 1 && orderAttrDown) newPriority = await orderAttrDown();
    if (dir === -1 && orderAttrUp) newPriority = await orderAttrUp();

    if (!newPriority) return;

    const newAttr = { ...latestAttr };
    newAttr.fileMetadata.appData.content.priority = newPriority;

    saveAttr(newAttr);
  };

  useEffect(() => {
    if (attribute && isNewAttribute) {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => setIsFadeOut(true), 500);
    }
  }, [attribute]);

  // Sync the latest attribute with data from server
  useEffect(
    () =>
      setLatestAttr({
        ...attributeDsr,
        ...updatedAttr,
        serverMetadata: {
          accessControlList: updatedAttr?.serverMetadata?.accessControlList ||
            attributeDsr?.serverMetadata?.accessControlList || {
              requiredSecurityGroup: SecurityGroupType.Owner,
            },
        },
        fileMetadata: {
          ...attributeDsr.fileMetadata,
          ...updatedAttr?.fileMetadata,
          appData: {
            ...attributeDsr.fileMetadata.appData,
            ...updatedAttr?.fileMetadata.appData,
            content: {
              ...attributeDsr.fileMetadata.appData.content,
              ...updatedAttr?.fileMetadata.appData.content,
            },
          },
        },
      }),
    [attributeDsr, updatedAttr]
  );

  const actions: ActionGroupOptionProps[] = [];
  if (orderAttrUp) {
    actions.push({
      label: t('Move up'),
      icon: ArrowUp,
      onClick: () => reorder(-1),
    });
  }
  if (orderAttrDown) {
    actions.push({
      label: t('Move down'),
      icon: ArrowDown,
      onClick: () => reorder(1),
    });
  }

  if (isAclEdit)
    actions.push({
      label: t('Cancel'),
      icon: Times,
      onClick: () => setIsAclEdit(false),
    });
  else
    actions.push({
      label: t('Change security'),
      icon: Shield,
      onClick: () => setIsAclEdit(true),
    });

  if (
    !(attribute.data?.isProtected && attribute.type === HomePageAttributes.Theme) &&
    !isNewAttribute
  ) {
    actions.push({
      label: t('Remove'),
      icon: Trash,
      confirmOptions: {
        title: t('Remove Attribute'),
        buttonText: t('Permanently remove'),
        body: `${t('Are you sure you want to remove this')} ${attribute.typeDefinition?.name} ${t(
          'attribute. This action cannot be undone.'
        )}`,
      },
      onClick: () => removeAttr({ attribute: latestAttr as HomebaseFile<AttributeVm> }), // latestAttr is not new, so it's a HomebaseFile
    });
  }
  return (
    <Section
      ref={sectionRef}
      title={
        <>
          <span className="flex flex-row">
            <button
              title={latestAttr.serverMetadata?.accessControlList?.requiredSecurityGroup}
              className={`mr-2 inline-block`}
              onClick={() => setIsAclEdit(true)}
            >
              <AclIcon
                className="h-5 w-5"
                acl={
                  latestAttr.serverMetadata?.accessControlList || {
                    requiredSecurityGroup: SecurityGroupType.Owner,
                  }
                }
              />
            </button>
            <span
              onClick={() => setIsAclEdit(true)}
              data-type={latestAttr?.fileMetadata?.appData?.content?.type}
            >
              {title ?? latestAttr?.fileMetadata?.appData?.content.typeDefinition?.name}{' '}
              <small className="block text-xs">
                {
                  <AclSummary
                    acl={
                      latestAttr.serverMetadata?.accessControlList || {
                        requiredSecurityGroup: SecurityGroupType.Owner,
                      }
                    }
                  />
                }
              </small>
            </span>
          </span>
        </>
      }
      actions={
        <>
          <ActionGroup type="mute" size="square" options={actions} />
          {saveStatus === 'error' && !isNewAttribute ? (
            <ActionButton
              state={saveStatus}
              type="primary"
              onClick={() => doManualSave(latestAttr)}
            >
              {t('Save')}
            </ActionButton>
          ) : null}
        </>
      }
      className={`relative ${
        isNewAttribute
          ? `transition-colors ${
              isFadeOut
                ? 'bg-white duration-[3000ms] dark:bg-black'
                : 'bg-indigo-50 dark:bg-indigo-900'
            }`
          : ''
      } ${className ?? ''}`}
    >
      <ErrorBoundary>
        {isAclEdit ? (
          <>
            <h2 className="mb-2 text-lg">{t('Who can access this attribute?')}</h2>
            <AclWizard
              acl={latestAttr.serverMetadata?.accessControlList || getDefaultAcl(attribute.type)}
              onConfirm={(newAcl) => {
                setIsAclEdit(false);
                const dirtyAttr: NewHomebaseFile<AttributeVm> = {
                  ...latestAttr,
                  serverMetadata: {
                    ...latestAttr.serverMetadata,
                    accessControlList: newAcl,
                  },
                };

                if (isNewAttribute) setLatestAttr(dirtyAttr);
                else doManualSave(dirtyAttr);
              }}
              onCancel={() => {
                if (isNewAttribute && onCancel) onCancel();
                setIsAclEdit(false);
              }}
            />
          </>
        ) : (
          <>
            <AttributeFields
              fileId={latestAttr.fileId}
              lastModified={(attributeDsr as HomebaseFile<unknown>)?.fileMetadata?.updated}
              attribute={latestAttr.fileMetadata.appData.content}
              onChange={changeHandler}
            />
            <SaveStatus className="mt-2 text-right sm:mt-0" state={saveStatus} error={saveError} />
            {isNewAttribute ? (
              <div className="flex flex-row justify-end pb-2">
                <p className="text-slate-500">
                  {t('Accessible by: ')}{' '}
                  <AclSummary
                    acl={
                      latestAttr.serverMetadata?.accessControlList || {
                        requiredSecurityGroup: SecurityGroupType.Owner,
                      }
                    }
                    maxLength={Infinity}
                  />
                </p>
              </div>
            ) : null}
            {isNewAttribute ? (
              <div className="flex flex-row-reverse">
                <ActionButton
                  type="primary"
                  className="ml-2"
                  onClick={() => doManualSave(latestAttr)}
                  state={saveStatus}
                >
                  {t('Save')}
                </ActionButton>
                {onCancel ? (
                  <ActionButton type="secondary" onClick={onCancel}>
                    {t('Cancel')}
                  </ActionButton>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </ErrorBoundary>
    </Section>
  );
};

const getDefaultAcl = (type: string): AccessControlList => {
  switch (type) {
    case BuiltInAttributes.Name:
    case BuiltInAttributes.Photo:
      return {
        requiredSecurityGroup: SecurityGroupType.Anonymous,
      };

    case BuiltInAttributes.Nickname:
    case BuiltInAttributes.Address:
    case BuiltInAttributes.Birthday:
    case BuiltInAttributes.PhoneNumber:
    case BuiltInAttributes.Email:
      return {
        // requiredSecurityGroup: SecurityGroupType.Connected,
        requiredSecurityGroup: SecurityGroupType.Connected,
      };

    case BuiltInAttributes.HomebaseIdentity:
    case BuiltInAttributes.TwitterUsername:
    case BuiltInAttributes.FacebookUsername:
    case BuiltInAttributes.InstagramUsername:
    case BuiltInAttributes.TiktokUsername:
    case BuiltInAttributes.LinkedinUsername:
    case BuiltInAttributes.YoutubeUsername:
    case BuiltInAttributes.DiscordUsername:
    case BuiltInAttributes.SnapchatUsername:
    case BuiltInAttributes.GithubUsername:
    case BuiltInAttributes.StackoverflowUsername:
    case BuiltInAttributes.EpicUsername:
    case BuiltInAttributes.RiotUsername:
    case BuiltInAttributes.SteamUsername:
    case BuiltInAttributes.MinecraftUsername:
      return {
        requiredSecurityGroup: SecurityGroupType.Connected,
      };

    default:
      return {
        requiredSecurityGroup: SecurityGroupType.Owner,
      };
  }
};

export default AttributeEditor;
