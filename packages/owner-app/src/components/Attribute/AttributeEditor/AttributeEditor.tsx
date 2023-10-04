import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AclIcon,
  AclSummary,
  AclWizard,
  SaveStatus,
  Times,
  t,
  useDebounce,
} from '@youfoundation/common-app';
import useAttribute from '../../../hooks/profiles/useAttribute';
import { AttributeVm } from '../../../hooks/profiles/useAttributes';
import { ActionButton } from '@youfoundation/common-app';

import Section from '../../ui/Sections/Section';
import AttributeFields from '../AttributeFields/AttributeFields';
import { ActionGroup } from '@youfoundation/common-app';
import { Trash, Shield, ArrowDown, ArrowUp } from '@youfoundation/common-app';
import { HomePageAttributes } from '@youfoundation/js-lib/public';

const AttributeEditor = ({
  attribute,
  className,
  reorderAttr,
  title,
  onCancel,
  onSave: onManualSave,
}: {
  attribute: AttributeVm;
  className?: string;
  reorderAttr?: (attr: AttributeVm, dir: 1 | -1) => Promise<number | undefined>;
  title?: string;
  onCancel?: () => void;
  onSave?: () => void;
}) => {
  const [isNewAttribute, setIsNewAttribute] = useState(false);
  const {
    save: { data: updatedAttr, mutate: saveAttr, status: saveStatus, error: saveError },
    remove: { mutate: removeAttr },
  } = useAttribute({});

  // Local state of the changes
  const [latestAttr, setLatestAttr] = useState<AttributeVm>({
    ...attribute,
    ...(updatedAttr || {}),
  });

  const [isAclEdit, setIsAclEdit] = useState(false);
  const [isFadeOut, setIsFadeOut] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const doManualSave = (dirtyAttr: AttributeVm) => {
    saveAttr({ ...dirtyAttr });
    if (onManualSave) onManualSave();
  };

  const debouncedSave = useDebounce(() => saveAttr(latestAttr), { timeoutMillis: 1500 });
  const changeHandler = (e: { target: { value: unknown; name: string } }) => {
    const dirtyAttr = { ...latestAttr };
    dirtyAttr.data[e.target.name] = e.target.value;
    setLatestAttr(dirtyAttr);

    if (!isNewAttribute) debouncedSave();
  };

  const reorder = async (dir: 1 | -1) => {
    const newPriority = reorderAttr && (await reorderAttr(attribute, dir));
    if (!newPriority) return;

    saveAttr({ ...latestAttr, priority: newPriority });
  };

  useEffect(() => {
    if (attribute && attribute.data?.isNew) {
      setIsNewAttribute(true);
      if (!attribute.acl || attribute.data?.isNew) setIsAclEdit(true);

      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => setIsFadeOut(true), 500);
    }
  }, [attribute]);

  // Sync the latest attribute with data from server
  useEffect(
    () => setLatestAttr({ ...attribute, ...(updatedAttr || {}) }),
    [attribute, updatedAttr]
  );

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
          <div className="hidden md:contents">
            {reorderAttr && (
              <>
                <ActionButton
                  className="hidden sm:flex"
                  icon={ArrowUp}
                  type="mute"
                  onClick={() => reorder(-1)}
                />
                <ActionButton
                  className="hidden sm:flex"
                  icon={ArrowDown}
                  type="mute"
                  onClick={() => reorder(1)}
                />
              </>
            )}
            <ActionButton
              icon={isAclEdit ? Times : Shield}
              className="hidden sm:flex"
              type="secondary"
              onClick={() => setIsAclEdit(!isAclEdit)}
            />
            {!(attribute.data.isProtected && attribute.type === HomePageAttributes.Theme) &&
            !isNewAttribute ? (
              <ActionButton
                type="remove"
                icon={Trash}
                className={`${!attribute.fileId ? 'pointer-events-none' : ''}`}
                confirmOptions={{
                  type: 'critical',
                  title: t('Remove Attribute'),
                  buttonText: t('Permanently remove'),
                  body: `${t('Are you sure you want to remove your')} ${
                    attribute.typeDefinition.name
                  } ${t('attribute. This action cannot be undone.')}`,
                }}
                onClick={() => removeAttr(attribute)}
              />
            ) : null}
          </div>
          {saveStatus === 'error' && !isNewAttribute ? (
            <ActionButton
              state={saveStatus}
              type="primary"
              onClick={() => doManualSave(latestAttr)}
            >
              {t('Save')}
            </ActionButton>
          ) : null}
          <ActionGroup
            type="mute"
            className="md:hidden"
            options={[
              ...(reorderAttr
                ? [
                    {
                      icon: ArrowUp,
                      label: t('Move up'),
                      onClick: () => reorder(-1),
                    },
                    {
                      icon: ArrowDown,
                      label: t('Move down'),
                      onClick: () => reorder(1),
                    },
                  ]
                : []),
              {
                icon: Shield,
                label: t('Change security'),
                onClick: () => setIsAclEdit(true),
              },
              {
                icon: Trash,
                label: t('Remove'),
                confirmOptions: {
                  title: t('Remove Attribute'),
                  buttonText: t('Permanently remove'),
                  body: `${t('Are you sure you want to remove this')} ${
                    attribute.typeDefinition.name
                  } ${t('attribute. This action cannot be undone.')}`,
                },
                onClick: () => removeAttr(attribute),
              },
            ]}
          />
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
