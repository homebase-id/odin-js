import { AccessControlList, SecurityGroupType } from '@homebase-id/js-lib/core';
import { useState } from 'react';
import { CircleSelector } from '../../form/CircleSelector';
import { t } from '../../helpers/i18n/dictionary';
import { ActionButton } from '../../ui/Buttons/ActionButton';

export const AclWizard = ({
  acl,
  onConfirm,
  onCancel,
  direction,
}: {
  acl: AccessControlList;
  onConfirm: (acl: AccessControlList) => void;
  onCancel?: () => void;
  direction?: 'row' | 'column';
}) => {
  const [currentAcl, setCurrentAcl] = useState(
    acl ?? { requiredSecurityGroup: SecurityGroupType.Owner }
  );

  return (
    <>
      <div className="mb-8">
        <RequiredSecurityGroupRadioGroup
          defaultAcl={currentAcl}
          onChange={(newAcl) => setCurrentAcl({ ...newAcl })}
          direction={direction}
        />
      </div>
      {currentAcl.requiredSecurityGroup.toLowerCase() ===
        SecurityGroupType.Connected.toLowerCase() && Array.isArray(currentAcl.circleIdList) ? (
        <div className="mb-16">
          <h2 className="mb-2 text-lg">{t('Do you want to only allow certain circles?')}</h2>
          <CircleSelector
            defaultValue={currentAcl.circleIdList}
            onChange={(e) => setCurrentAcl({ ...currentAcl, circleIdList: e.target.value })}
          />
        </div>
      ) : null}
      <div className="flex gap-2 w-full flex-col sm:flex-row-reverse">
        <ActionButton
          type="primary"
          isDisabled={
            (currentAcl.requiredSecurityGroup.toLowerCase() ===
              SecurityGroupType.Connected.toLowerCase() &&
              currentAcl.circleIdList &&
              !currentAcl.circleIdList.length) ||
            false
          }
          onClick={() => onConfirm(currentAcl)}
        >
          {t('Continue')}
        </ActionButton>
        {onCancel ? (
          <ActionButton type="secondary" onClick={onCancel}>
            {t('Cancel')}
          </ActionButton>
        ) : null}
      </div>
    </>
  );
};

const RequiredSecurityGroupRadioGroup = ({
  defaultAcl,
  onChange,
  direction = 'row',
}: {
  defaultAcl?: AccessControlList;
  onChange?: (acl: AccessControlList) => void;
  direction?: 'row' | 'column';
}) => {
  const GroupOption = (props: { name: string; description: string; value: AccessControlList }) => {
    const checked =
      props.value.requiredSecurityGroup.toLowerCase() ===
        defaultAcl?.requiredSecurityGroup.toLowerCase() &&
      Array.isArray(props.value.circleIdList) === Array.isArray(defaultAcl.circleIdList);

    return (
      <button
        className={`flex h-full w-full flex-col justify-start rounded-md px-3 py-2 text-left hover:shadow-md ${
          checked ? 'bg-indigo-500 text-white dark:bg-indigo-500' : 'bg-slate-100 dark:bg-slate-800'
        }`}
        onClick={() => onChange && onChange(props.value)}
      >
        {props.name}
        <small className={`block text-sm ${checked ? 'text-slate-300' : 'text-slate-500'}`}>
          {props.description}
        </small>
      </button>
    );
  };

  return (
    <>
      <div
        className={`gap-1 ${
          direction === 'row'
            ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5'
            : 'flex flex-col gap-1'
        }`}
      >
        <GroupOption
          name={t('Owner')}
          description={t('Only you')}
          value={{ requiredSecurityGroup: SecurityGroupType.Owner }}
        />

        <GroupOption
          name={t('Circles')}
          description={t('Only people that are member of a circle')}
          value={{ requiredSecurityGroup: SecurityGroupType.Connected, circleIdList: [] }}
        />

        <GroupOption
          name={t('Connected')}
          description={t('Only people that are connected to you')}
          value={{ requiredSecurityGroup: SecurityGroupType.Connected }}
        />

        <GroupOption
          name={t('Authenticated')}
          description={t('Only people that are authenticated')}
          value={{ requiredSecurityGroup: SecurityGroupType.Authenticated }}
        />

        <GroupOption
          name={t('Public')}
          description={t('Accessible by everyone on the internet')}
          value={{ requiredSecurityGroup: SecurityGroupType.Anonymous }}
        />
      </div>
    </>
  );
};
