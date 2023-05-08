import { useEffect, useRef, useState } from 'react';
import { t } from '@youfoundation/common-app';
import useAttribute from '../../../hooks/profiles/useAttribute';
import { AttributeVm } from '../../../hooks/profiles/useAttributes';
import ActionButton from '../../ui/Buttons/ActionButton';
import SaveStatus from '../../ui/Buttons/SaveStatus';
import Section from '../../ui/Sections/Section';
import { AclIcon, AclSummary } from '../../Acl/AclEditor/AclEditor';
import AttributeFields from '../AttributeFields/AttributeFields';
import AclWizard from '../../Acl/AclWizard/AclWizard';
import ActionGroup from '../../ui/Buttons/ActionGroup';
import { Trash, Shield, ArrowDown, ArrowUp } from '@youfoundation/common-app';

const AttributeEditor = ({
  attribute,
  className,
  reorderAttr,
  title,
  onCancel,
  onSave,
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
    save: { mutate: saveAttr, status: saveStatus, error: saveError },
    remove: { mutate: removeAttr },
  } = useAttribute({});
  const [newAttr, setNewAttr] = useState({ ...attribute });
  const [isAclEdit, setIsAclEdit] = useState(false);
  const [isFadeOut, setIsFadeOut] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const saveNewData = (dirtyAttr: AttributeVm) => {
    // Each save should above everything that might happen, remove the isNew state;
    saveAttr({ ...dirtyAttr, data: { ...dirtyAttr.data, isNew: undefined } });
    if (onSave) {
      onSave();
    }
  };

  const changeHandler = (e: { target: { value: unknown; name: string } }) => {
    const dirtyAttr = { ...newAttr };

    dirtyAttr.data[e.target.name] = e.target.value;

    setNewAttr(dirtyAttr);
    if (!isNewAttribute) {
      saveNewData(dirtyAttr);
    }
  };

  const reorder = async (dir: 1 | -1) => {
    const newPriority = reorderAttr && (await reorderAttr(attribute, dir));
    if (!newPriority) {
      return;
    }
    const dirtyAttr = { ...newAttr, priority: newPriority };
    setNewAttr(dirtyAttr);
    saveNewData(dirtyAttr);
  };

  useEffect(() => {
    if (attribute) {
      if (attribute.data?.isNew) {
        setIsNewAttribute(true);
        if (!attribute.acl || attribute.data?.isNew) {
          setIsAclEdit(true);
        }

        sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          setIsFadeOut(true);
        }, 500);
      }

      setNewAttr({ ...attribute });
    }
  }, [attribute]);

  return (
    <Section
      ref={sectionRef}
      title={
        <>
          <span className="flex flex-row">
            <button
              title={newAttr.acl?.requiredSecurityGroup}
              className={`mr-2 inline-block`}
              onClick={() => setIsAclEdit(true)}
            >
              <AclIcon className="h-5 w-5" acl={newAttr.acl} />
            </button>
            <span onClick={() => setIsAclEdit(true)}>
              {title ?? newAttr.typeDefinition.name}{' '}
              <small className="block text-xs">{<AclSummary acl={newAttr.acl} />}</small>
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
              icon={isAclEdit ? 'times' : Shield}
              className="hidden sm:flex"
              type="secondary"
              onClick={() => setIsAclEdit(!isAclEdit)}
            />
            <ActionButton
              type="remove"
              icon="trash"
              className={`${!attribute.fileId ? 'pointer-events-none' : ''}`}
              confirmOptions={{
                title: t('Remove Attribute'),
                buttonText: t('Permanently remove'),
                body: `${t('Are you sure you want to remove your')} ${
                  attribute.typeDefinition.name
                } ${t('attribute. This action cannot be undone.')}`,
              }}
              onClick={() => removeAttr(attribute)}
            />
          </div>
          {saveStatus === 'error' && !isNewAttribute ? (
            <ActionButton state={saveStatus} type="primary" onClick={() => saveNewData(newAttr)}>
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
          acl={newAttr.acl}
          onConfirm={(newAcl) => {
            setIsAclEdit(false);

            const dirtyAttr = { ...newAttr, acl: newAcl };
            setNewAttr(dirtyAttr);

            if (!isNewAttribute) {
              saveNewData(dirtyAttr);
            }
          }}
          onCancel={() => {
            if (isNewAttribute && onCancel) {
              onCancel();
            }
            setIsAclEdit(false);
          }}
        />
      ) : (
        <>
          <AttributeFields attribute={newAttr} onChange={changeHandler} />
          <SaveStatus className="mt-2 text-right sm:mt-0" state={saveStatus} error={saveError} />
          {isNewAttribute ? (
            <div className="flex flex-row justify-end pb-2">
              <p className="text-slate-500">
                {t('Accessible by: ')} <AclSummary acl={newAttr?.acl} maxLength={Infinity} />
              </p>
            </div>
          ) : null}
          {isNewAttribute ? (
            <div className="flex flex-row-reverse">
              <ActionButton
                type="primary"
                className="ml-2"
                onClick={() => saveNewData(newAttr)}
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
