import {
  ApiType,
  OdinClient,
  HomebaseFile,
  NewHomebaseFile,
  SecurityGroupType,
} from '@homebase-id/js-lib/core';
import { useState } from 'react';

import { ChannelTemplateSelector } from './ChannelTemplateSelector';
import { BlogConfig, ChannelTemplate } from '@homebase-id/js-lib/public';
import { slugify, stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { ActionButton } from '../ui/Buttons/ActionButton';
import { t } from '../helpers/i18n/dictionary';
import { AclIcon, AclSummary } from '../acl/AclInfo/AclInfo';
import { Persons } from '../ui/Icons/Persons';
import { ActionGroup } from '../ui/Buttons/ActionGroup';
import { Trash } from '../ui/Icons/Trash';
import { AclWizard } from '../acl/AclWizard/AclWizard';
import { Label } from '../form/Label';
import { Input } from '../form/Input';
import { Textarea } from '../form/Textarea';
import { CheckboxToggle } from '../form/CheckboxToggle';
import { Exclamation, ExternalLink, Pencil } from '../ui/Icons';
import { ActionLink, Alert } from '../ui';
import { useCollaborativeChannel } from '../hooks/socialFeed/channels/useCollaborativeChannel';
import { ChannelDefinitionVm } from '../hooks/socialFeed/channels/useChannels';
import { useManageChannel } from '../hooks/socialFeed/channels/useManageChannel';
import { useOdinClientContext } from '../hooks';

export const ChannelItem = ({
  chnl: chnlDsr,
  onClose,
  className,
  isDefaultEdit,
}: {
  chnl?: HomebaseFile<ChannelDefinitionVm> | NewHomebaseFile<ChannelDefinitionVm>;
  onClose?: () => void;
  className?: string;
  isDefaultEdit?: boolean;
}) => {
  const identity = useOdinClientContext().getHostIdentity();
  const isNew = !chnlDsr;

  const [isEdit, setIsEdit] = useState(isDefaultEdit);
  const [isAclEdit, setIsAclEdit] = useState(isNew);
  const {
    save: { mutateAsync: saveChannel, status: saveStatus },
    remove: { mutateAsync: removeChannel },
  } = useManageChannel();

  const {
    validate: { data: validateCollaborativeData },
    convertToCollaborativeChannel: { mutateAsync: convertToCollaborativeChannel },
    convertToPrivateChannel: { mutateAsync: convertToPrivateChannel },
  } = useCollaborativeChannel({ channelId: chnlDsr?.fileMetadata.appData.uniqueId as string });

  const chnl = chnlDsr?.fileMetadata.appData.content;

  const [newName, setNewName] = useState(chnl?.name);
  const [newSlug, setNewSlug] = useState(chnl?.slug);
  const [newDescription, setNewDescription] = useState(chnl?.description);
  const [newTemplateId, setNewTemplateId] = useState(chnl?.templateId);
  const [newShowOnHomePage, setNewShowOnHomePage] = useState(chnl?.showOnHomePage);
  const [newAcl, setNewAcl] = useState(
    chnlDsr?.serverMetadata?.accessControlList ?? {
      requiredSecurityGroup: SecurityGroupType.Anonymous,
    }
  );

  return (
    <div
      className={`${isEdit ? '' : 'cursor-pointer'} ${
        className ?? ''
      } rounded-md border border-slate-100 px-4 py-4 dark:border-slate-800`}
      onClick={() => setIsEdit(true)}
    >
      {isEdit || !chnl ? (
        <>
          {
            <span className="gap-2 mb-5 flex flex-row items-center">
              <button
                title={newAcl.requiredSecurityGroup}
                className={`inline-block`}
                onClick={() => setIsAclEdit(true)}
              >
                <AclIcon className="h-5 w-5" acl={newAcl} />
              </button>
              <span onClick={() => setIsAclEdit(true)}>
                {chnl?.name || `"${t('New channel')}"`}{' '}
                <small className="block text-xs">{<AclSummary acl={newAcl} />}</small>
              </span>
              <span className="ml-auto"></span>
              {chnl?.isCollaborative ? (
                <>
                  <p title={t('Invalid configuration')}>
                    {validateCollaborativeData ? <Exclamation className="w-5 h-5" /> : null}
                  </p>
                  <p title={t('Collaborative')}>
                    <Persons className="w-5 h-5" />
                  </p>
                </>
              ) : null}

              {chnlDsr &&
              chnlDsr.fileId &&
              !stringGuidsEqual(
                chnlDsr.fileMetadata.appData.uniqueId,
                BlogConfig.PublicChannelId
              ) ? (
                <ActionGroup
                  type="mute"
                  options={[
                    chnlDsr.fileMetadata.appData.content.isCollaborative
                      ? {
                          label: t('Convert into a private channel'),
                          icon: Persons,
                          onClick: async (e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            convertToPrivateChannel(chnlDsr as HomebaseFile<ChannelDefinitionVm>);
                            return false;
                          },
                        }
                      : chnlDsr.serverMetadata?.accessControlList.requiredSecurityGroup ===
                          SecurityGroupType.Connected
                        ? {
                            label: t('Convert into a collaborative channel'),
                            icon: Persons,
                            onClick: async (e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              convertToCollaborativeChannel(
                                chnlDsr as HomebaseFile<ChannelDefinitionVm>
                              );
                              return false;
                            },
                          }
                        : undefined,
                    {
                      label: t('Remove channel'),
                      confirmOptions: {
                        type: 'info',
                        title: t('Remove channel'),
                        body: t(
                          'Are you sure you want to remove this channel, this action cannot be undone. All posts published on this channel will also be unpublished.'
                        ),
                        buttonText: t('Remove'),
                      },
                      icon: Trash,
                      onClick: async (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        await removeChannel(chnlDsr as HomebaseFile<ChannelDefinitionVm>);
                        return false;
                      },
                    },
                  ]}
                ></ActionGroup>
              ) : null}
            </span>
          }
          {isAclEdit ? (
            <AclWizard
              acl={newAcl}
              onConfirm={(newAcl) => {
                setIsAclEdit(false);
                setNewAcl(newAcl);
              }}
              onCancel={() => {
                setIsAclEdit(false);
                if (isNew) onClose && onClose();
              }}
            />
          ) : (
            <>
              {validateCollaborativeData ? (
                <Alert type="warning" title={t('Invalid configuration')} className="mb-4">
                  <p>
                    {t(
                      'The channel is marked as collaborative, but is missing the necessary circle permissions or drive attribute'
                    )}
                  </p>
                  <div className="mt-2 flex flex-row-reverse gap-4">
                    <ActionButton
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        convertToCollaborativeChannel(chnlDsr as HomebaseFile<ChannelDefinitionVm>);
                      }}
                    >
                      {t('Add permissions')}
                    </ActionButton>

                    <ActionButton
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        convertToPrivateChannel(chnlDsr as HomebaseFile<ChannelDefinitionVm>);
                      }}
                      type="secondary"
                    >
                      {t('Convert to private channel')}
                    </ActionButton>
                  </div>
                </Alert>
              ) : null}

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  if (!e.currentTarget.reportValidity()) return;

                  const uploadResult = await saveChannel({
                    ...chnlDsr,
                    fileMetadata: {
                      ...chnlDsr?.fileMetadata,
                      appData: {
                        ...chnlDsr?.fileMetadata.appData,
                        content: {
                          ...chnlDsr?.fileMetadata.appData.content,
                          name: newName ?? '',
                          slug: newSlug ?? '',
                          description: newDescription ?? '',
                          showOnHomePage: newShowOnHomePage ?? false,
                          templateId: newTemplateId ?? ChannelTemplate.ClassicBlog,
                        },
                      },
                    },
                    serverMetadata: {
                      ...chnlDsr?.serverMetadata,
                      accessControlList: newAcl,
                    },
                  });
                  if (uploadResult) {
                    setIsEdit(false);
                    onClose && onClose();
                  }
                  return false;
                }}
                className="flex w-full flex-col"
              >
                <div className="mb-5">
                  <Label htmlFor="name">{t('Name')}</Label>
                  <Input
                    id="name"
                    defaultValue={chnl?.name}
                    required={true}
                    onChange={(e) => {
                      setNewName(e.target.value);
                      setNewSlug(slugify(e.target.value));
                    }}
                  />
                </div>
                <div className="mb-5">
                  <Label htmlFor="description">{t('Description')}</Label>
                  <Textarea
                    id="description"
                    defaultValue={chnl?.description}
                    onChange={(e) => setNewDescription(e.target.value)}
                  />
                </div>
                <div className="mb-5 flex flex-row items-center gap-5">
                  <Label htmlFor="showOnHomepage" className="mb-0">
                    {t('Include posts from this channel on your feed')}
                  </Label>
                  <CheckboxToggle
                    id="showOnHomepage"
                    defaultChecked={chnl?.showOnHomePage}
                    onChange={(e) => setNewShowOnHomePage(e.target.checked)}
                  />
                </div>
                <div className="mb-5">
                  <Label htmlFor="template">{t('Template')}</Label>
                  <ChannelTemplateSelector
                    name="templateId"
                    defaultValue={(chnl?.templateId ?? ChannelTemplate.ClassicBlog) + ''}
                    onChange={(e) => setNewTemplateId(parseInt(e.target.value))}
                  />
                </div>
                <div className="gap-2 flex flex-row-reverse">
                  <ActionButton state={saveStatus}>
                    {isNew && !chnl ? t('Create Drive & Save') : t('Save')}
                  </ActionButton>
                  <ActionButton
                    type="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setIsEdit(false);
                      onClose && onClose();
                      return false;
                    }}
                  >
                    {t('Cancel')}
                  </ActionButton>
                </div>
              </form>
            </>
          )}
        </>
      ) : (
        <div className="flex flex-row items-center gap-2">
          <h2 className="text-lg">
            {chnl?.name} <small className="text-xs">({<AclSummary acl={newAcl} />})</small>
            <small className="text-md block">{chnl.description}</small>
          </h2>
          <span className="ml-auto"></span>
          {chnl?.isCollaborative ? (
            <>
              <p title={t('Invalid configuration')}>
                {validateCollaborativeData ? <Exclamation className="w-5 h-5" /> : null}
              </p>
              <p title={t('Collaborative')}>
                <Persons className="w-5 h-5" />
              </p>
            </>
          ) : null}
          <ActionButton icon={Pencil} size="square" type="mute"></ActionButton>
          <ActionLink
            icon={ExternalLink}
            size="square"
            type="mute"
            href={`${new OdinClient({ hostIdentity: identity, api: ApiType.Guest }).getRoot()}/posts/${chnl?.slug}`}
          ></ActionLink>
        </div>
      )}
    </div>
  );
};
