import { HomebaseFile, NewHomebaseFile, SecurityGroupType } from '@youfoundation/js-lib/core';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AclIcon,
  AclSummary,
  AclWizard,
  ActionButton,
  ChannelDefinitionVm,
  CheckboxToggle,
  Pencil,
  Textarea,
  Trash,
  useChannels,
} from '@youfoundation/common-app';
import { t } from '@youfoundation/common-app';
import { useChannel } from '@youfoundation/common-app';
import { usePortal } from '@youfoundation/common-app';
import { Input } from '@youfoundation/common-app';
import { Label } from '@youfoundation/common-app';
import { DialogWrapper, Plus } from '@youfoundation/common-app';
import { Quote } from '@youfoundation/common-app';
import { ChannelTemplateSelector } from './ChannelTemplateSelector';
import { BlogConfig, ChannelTemplate } from '@youfoundation/js-lib/public';
import { slugify, stringGuidsEqual } from '@youfoundation/js-lib/helpers';

export const ChannelsDialog = ({
  isOpen,

  onCancel,
}: {
  isOpen: boolean;

  onCancel: () => void;
}) => {
  const target = usePortal('modal-container');
  const { data: channels } = useChannels({ isAuthenticated: true, isOwner: true });
  const [isAddNew, setIsAddNew] = useState(false);

  if (!isOpen) {
    return null;
  }

  const dialog = (
    <DialogWrapper
      title={
        <div className="flex flex-row items-center">
          <Quote className="mr-2 h-6 w-6" /> {t('Channels')}
        </div>
      }
      onClose={onCancel}
      isSidePanel={true}
      size="4xlarge"
      keepOpenOnBlur={true}
    >
      <div className="-m-2">
        {channels?.map((chnl) => (
          <div className="p-2" key={chnl.fileId}>
            <ChannelItem chnl={chnl} className="bg-slate-50 dark:bg-slate-900" />
          </div>
        ))}
        {isAddNew ? (
          <div className="p-2" key={'new'}>
            <ChannelItem
              onClose={() => setIsAddNew(false)}
              className="bg-slate-50 dark:bg-slate-900"
            />
          </div>
        ) : (
          <div className="p-2" key={'new'}>
            <div
              onClick={() => setIsAddNew(true)}
              className="flex cursor-pointer flex-row items-center rounded-md border border-slate-100 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <Plus className="mr-2 h-4 w-4" /> {t('Add new')}
            </div>
          </div>
        )}
      </div>
      <div className="-m-2 flex flex-row-reverse py-3">
        <ActionButton className="m-2" onClick={onCancel} type="secondary">
          {t('Cancel')}
        </ActionButton>
      </div>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};

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
  const isNew = !chnlDsr;

  const [isEdit, setIsEdit] = useState(isDefaultEdit);
  const [isAclEdit, setIsAclEdit] = useState(isNew);
  const {
    save: { mutateAsync: saveChannel, status: saveStatus },
    remove: { mutateAsync: removeChannel, status: removeStatus },
  } = useChannel({});

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
            <span className="mb-5 flex flex-row">
              <button
                title={newAcl.requiredSecurityGroup}
                className={`mr-2 inline-block`}
                onClick={() => setIsAclEdit(true)}
              >
                <AclIcon className="h-5 w-5" acl={newAcl} />
              </button>
              <span onClick={() => setIsAclEdit(true)}>
                {chnl?.name || `"${t('New channel')}"`}{' '}
                <small className="block text-xs">{<AclSummary acl={newAcl} />}</small>
              </span>
            </span>
          }
          {isAclEdit ? (
            <>
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
            </>
          ) : (
            <>
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
                <div className="-m-2 flex flex-row-reverse">
                  <ActionButton className="m-2" state={saveStatus}>
                    {isNew && !chnl ? t('Create Drive & Save') : t('Save')}
                  </ActionButton>
                  <ActionButton
                    type="secondary"
                    className="m-2"
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
                  {chnlDsr &&
                  chnlDsr.fileId &&
                  !stringGuidsEqual(
                    chnlDsr.fileMetadata.appData.uniqueId,
                    BlogConfig.PublicChannelId
                  ) ? (
                    <ActionButton
                      className="m-2 mr-auto"
                      state={removeStatus}
                      type="remove"
                      icon={Trash}
                      onClick={async (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        await removeChannel(chnlDsr as HomebaseFile<ChannelDefinitionVm>);
                        return false;
                      }}
                      confirmOptions={{
                        type: 'info',
                        title: t('Remove channel'),
                        body: t(
                          'Are you sure you want to remove this channel, this action cannot be undone. All posts published on this channel will also be unpublished.'
                        ),
                        buttonText: t('Remove'),
                      }}
                    >
                      {t('Remove')}
                    </ActionButton>
                  ) : null}
                </div>
              </form>
            </>
          )}
        </>
      ) : (
        <div className="flex flex-row items-center">
          <h2 className="text-lg">
            {chnl?.name} <small className="text-xs">({<AclSummary acl={newAcl} />})</small>
            <small className="text-md block">{chnl.description}</small>
          </h2>
          <ActionButton icon={Pencil} size="square" className="ml-auto" type="mute"></ActionButton>
        </div>
      )}
    </div>
  );
};
