import { AccessControlList, SecurityGroupType } from '@youfoundation/js-lib';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../../helpers/i18n/dictionary';
import usePortal from '../../../hooks/portal/usePortal';
import Select from '../../Form/Select';
import { DialogWrapper, Lock } from '@youfoundation/common-app';
import { OpenLock } from '@youfoundation/common-app';
import { pascalCase } from '../../../helpers/common';
import ActionButton from '../../ui/Buttons/ActionButton';
import CircleSelector from '../../Form/CircleSelector';

const AclDialog = ({
  title,
  confirmText,
  isOpen,
  acl,
  onConfirm,
  onCancel,
}: {
  title: string;
  confirmText?: string;

  isOpen: boolean;

  acl: AccessControlList;

  onConfirm: (acl: AccessControlList) => void;
  onCancel: () => void;
}) => {
  const target = usePortal('modal-container');
  const [newAcl, setNewAcl] = useState<AccessControlList>(acl);

  if (!isOpen) {
    return null;
  }

  const saveAcl = () => {
    onConfirm(newAcl);
  };

  const updateSecurityGroup = (e: {
    target: {
      name: string;
      value: string;
    };
  }) => {
    const dirtyAcl = {
      ...newAcl,
      requiredSecurityGroup: (SecurityGroupType as Record<string, SecurityGroupType>)[
        pascalCase(e.target.value)
      ],
    };
    if (
      dirtyAcl.circleIdList &&
      (dirtyAcl.requiredSecurityGroup === SecurityGroupType.Owner.toLowerCase() ||
        dirtyAcl.requiredSecurityGroup === SecurityGroupType.Anonymous.toLowerCase())
    ) {
      dirtyAcl.circleIdList = [];
    }

    setNewAcl(dirtyAcl);
  };

  const dialog = (
    <DialogWrapper title={title} onClose={onCancel}>
      <>
        <h2 className="mb-2 text-xl">{t('General access')}</h2>
        <RequiredSecurityGroupSelect
          onChange={updateSecurityGroup}
          group={
            (newAcl.requiredSecurityGroup.toLowerCase() as SecurityGroupType) ??
            SecurityGroupType.Owner
          }
        />

        <h2 className="mb-2 mt-4 flex flex-col text-xl">
          {t('Circles with access')}
          <small className="text-sm text-slate-500">
            {t('Selecting circles will automatically set the security to "Connected"')}
          </small>
        </h2>
        <CircleSelector
          defaultValue={newAcl.circleIdList ?? []}
          onChange={(e) => {
            setNewAcl({
              ...newAcl,
              circleIdList: e.target.value,
              // Reset security group to connected when circles were specified
              requiredSecurityGroup: e.target.value.length
                ? SecurityGroupType.Connected
                : newAcl.requiredSecurityGroup,
            });
          }}
        />

        <div className="-m-2 flex flex-row-reverse py-3">
          <ActionButton className="m-2" onClick={saveAcl}>
            {confirmText ?? 'Save'}
          </ActionButton>
          <ActionButton
            className="m-2"
            type="secondary"
            onClick={() => {
              setNewAcl(acl);
              onCancel();
            }}
          >
            {t('Cancel')}
          </ActionButton>
        </div>
      </>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};

export const RequiredSecurityGroupSelect = ({
  group,
  onChange,
}: {
  group: SecurityGroupType;
  onChange: (e: { target: { name: string; value: string } }) => void;
}) => {
  const StateIcon =
    group === SecurityGroupType.Anonymous.toLowerCase() ||
    group === SecurityGroupType.Authenticated.toLowerCase()
      ? OpenLock
      : Lock;

  return (
    <>
      <div className="flex w-full rounded-lg border p-4 dark:border-slate-700">
        <div className="mr-2 flex flex-col justify-center">
          <div className="rounded-full bg-slate-100 p-3 dark:bg-slate-600">
            <StateIcon className="h-5 w-5" />
          </div>
        </div>
        <div className="flex w-full flex-col">
          <Select
            value={group.toLowerCase()}
            onChange={onChange}
            className="w-full border-0 bg-transparent pl-0 dark:bg-transparent"
          >
            <option value="anonymous">{t('Public')}</option>
            <option value="authenticated">{t('Authenticated')}</option>
            <option value="connected">{t('Connected')}</option>
            <option value="owner">{t('Owner')}</option>
          </Select>
          <p className="pl-[0.2rem] text-sm text-slate-500">
            {group === SecurityGroupType.Anonymous.toLowerCase()
              ? t('Accessible by everyone on the internet')
              : group === SecurityGroupType.Authenticated.toLowerCase()
              ? t('Only people that are authenticated')
              : group === SecurityGroupType.Connected.toLowerCase()
              ? t('Only people that are connected to you')
              : t('Only you')}
          </p>
        </div>
      </div>
    </>
  );
};

export default AclDialog;
