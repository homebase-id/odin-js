import { useEffect, useRef, useState } from 'react';
import {
  AclIcon,
  AclSummary,
  AclWizard,
  ActionGroupOptionProps,
  SaveStatus,
  Times,
  t,
  useDebounce,
} from '@youfoundation/common-app';
import { useAttribute } from '../../../hooks/profiles/useAttribute';
import { AttributeVm, NewAttributeVm } from '../../../hooks/profiles/useAttributes';
import { ActionButton } from '@youfoundation/common-app';

import Section from '../../ui/Sections/Section';
import AttributeFields from '../AttributeFields/AttributeFields';
import { ActionGroup } from '@youfoundation/common-app';
import { Trash, Shield, ArrowDown, ArrowUp } from '@youfoundation/common-app';
import { HomePageAttributes } from '@youfoundation/js-lib/public';
import { EmbeddedThumb, SecurityGroupType } from '@youfoundation/js-lib/core';

const AttributeEditor = ({
  attribute,
  className,
  reorderAttr,
  title,
  onCancel,
  onSave: onManualSave,
}: {
  attribute: AttributeVm | NewAttributeVm;
  className?: string;
  reorderAttr?: (attr: AttributeVm, dir: 1 | -1) => Promise<number | undefined>;
  title?: string;
  onCancel?: () => void;
  onSave?: () => void;
}) => {
  const isNewAttribute = 'isNew' in attribute && attribute.isNew;
  const {
    save: { data: updatedAttr, mutate: saveAttr, status: saveStatus, error: saveError },
    remove: { mutate: removeAttr },
  } = useAttribute({});

  // Local state of the changes
  const [latestAttr, setLatestAttr] = useState<AttributeVm>({
    acl: { requiredSecurityGroup: SecurityGroupType.Owner },
    ...attribute,
    ...(updatedAttr || {}),
  });

  const [isAclEdit, setIsAclEdit] = useState(!attribute.acl);
  const [isFadeOut, setIsFadeOut] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const doManualSave = (dirtyAttr: AttributeVm) => {
    delete (dirtyAttr as any).isNew;

    saveAttr({ ...dirtyAttr });
    if (onManualSave) onManualSave();
  };

  const debouncedSave = useDebounce(() => saveAttr(latestAttr), { timeoutMillis: 1500 });
  const changeHandler = (e: {
    target: { value: unknown; name: string; previewThumbnail?: EmbeddedThumb };
  }) => {
    const dirtyAttr = { ...latestAttr };
    dirtyAttr.data[e.target.name] = e.target.value;
    dirtyAttr.previewThumbnail = e.target.previewThumbnail;
    setLatestAttr(dirtyAttr);

    if (!isNewAttribute) debouncedSave();
  };

  const reorder = async (dir: 1 | -1) => {
    if (isNewAttribute) return;
    const newPriority = reorderAttr && (await reorderAttr(attribute as AttributeVm, dir));
    if (!newPriority) return;

    saveAttr({ ...latestAttr, priority: newPriority });
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
      'acl' in attribute
        ? setLatestAttr({
            ...(attribute as AttributeVm),
            ...(updatedAttr || {}),
          })
        : undefined,
    [attribute, updatedAttr]
  );

  const actions: ActionGroupOptionProps[] = [];
  if (reorderAttr) {
    actions.push({
      label: t('Move up'),
      icon: ArrowUp,
      onClick: () => reorder(-1),
    });
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
    !(attribute.data.isProtected && attribute.type === HomePageAttributes.Theme) &&
    !isNewAttribute
  ) {
    actions.push({
      label: t('Remove'),
      icon: Trash,
      confirmOptions: {
        title: t('Remove Attribute'),
        buttonText: t('Permanently remove'),
        body: `${t('Are you sure you want to remove this')} ${attribute.typeDefinition.name} ${t(
          'attribute. This action cannot be undone.'
        )}`,
      },
      onClick: () => removeAttr(latestAttr),
    });
  }

  return (
    <Section
      ref={sectionRef}
      title={
        <>
          <span className="flex flex-row">
            <button
              title={latestAttr.acl?.requiredSecurityGroup}
              className={`mr-2 inline-block`}
              onClick={() => setIsAclEdit(true)}
            >
              <AclIcon className="h-5 w-5" acl={latestAttr.acl} />
            </button>
            <span onClick={() => setIsAclEdit(true)} data-type={latestAttr?.type}>
              {title ?? latestAttr.typeDefinition.name}{' '}
              <small className="block text-xs">{<AclSummary acl={latestAttr.acl} />}</small>
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
      {isAclEdit ? (
        <AclWizard
          acl={latestAttr.acl}
          onConfirm={(newAcl) => {
            setIsAclEdit(false);
            const dirtyAttr = { ...latestAttr, acl: newAcl };

            if (isNewAttribute) setLatestAttr(dirtyAttr);
            else doManualSave(dirtyAttr);
          }}
          onCancel={() => {
            if (isNewAttribute && onCancel) onCancel();
            setIsAclEdit(false);
          }}
        />
      ) : (
        <>
          <AttributeFields attribute={latestAttr} onChange={changeHandler} />
          <SaveStatus className="mt-2 text-right sm:mt-0" state={saveStatus} error={saveError} />
          {isNewAttribute ? (
            <div className="flex flex-row justify-end pb-2">
              <p className="text-slate-500">
                {t('Accessible by: ')} <AclSummary acl={latestAttr?.acl} maxLength={Infinity} />
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
    </Section>
  );
};

export default AttributeEditor;
