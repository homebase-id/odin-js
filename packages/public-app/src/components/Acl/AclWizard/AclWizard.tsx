import { AccessControlList, SecurityGroupType } from '@youfoundation/js-lib';
import { useState } from 'react';
import { t } from '@youfoundation/common-app';
import CircleSelector from '../../Form/CircleSelector';

import ActionButton from '../../ui/Buttons/ActionButton';

const AclWizard = ({
  acl,
  onConfirm,
  onCancel,
}: {
  acl: AccessControlList;
  onConfirm: (acl: AccessControlList) => void;
  onCancel?: () => void;
}) => {
  const [currentAcl, setCurrentAcl] = useState(
    acl ?? { requiredSecurityGroup: SecurityGroupType.Owner }
  );

  return (
    <>
      <h2 className="mb-2 text-lg">{t('Who can access this?')}</h2>
      <div className="mb-8">
        <RequiredSecurityGroupRadioGroup
          defaultAcl={currentAcl}
          onChange={(newAcl) => setCurrentAcl({ ...newAcl })}
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
      <div className="flex flex-row-reverse">
        <ActionButton
          type="primary"
          className="ml-2"
          isDisabled={
            currentAcl.requiredSecurityGroup.toLowerCase() ===
              SecurityGroupType.Connected.toLowerCase() &&
            !!currentAcl.circleIdList &&
            !currentAcl.circleIdList.length
          }
          onClick={() => onConfirm(currentAcl)}
        >
          {t('Continue')}
        </ActionButton>
        {onCancel ? (
          <ActionButton type="secondary" className="ml-2" onClick={onCancel}>
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
}: {
  defaultAcl: AccessControlList;
  onChange?: (acl: AccessControlList) => void;
}) => {
  const GroupOption = (props: { name: string; description: string; value: AccessControlList }) => {
    const checked =
      props.value.requiredSecurityGroup.toLowerCase() ===
        defaultAcl.requiredSecurityGroup.toLowerCase() &&
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
      <div className="-m-1 flex flex-row flex-wrap">
        <div className="w-1/2 p-1 md:w-1/5">
          <GroupOption
            name={t('Owner')}
            description={t('Only you')}
            value={{ requiredSecurityGroup: SecurityGroupType.Owner }}
          />
        </div>
        <div className="w-1/2 p-1 md:w-1/5">
          <GroupOption
            name={t('Circles')}
            description={t('Only people that are member of a circle')}
            value={{ requiredSecurityGroup: SecurityGroupType.Connected, circleIdList: [] }}
          />
        </div>
        <div className="w-1/2 p-1 md:w-1/5">
          <GroupOption
            name={t('Connected')}
            description={t('Only people that are connected to you')}
            value={{ requiredSecurityGroup: SecurityGroupType.Connected }}
          />
        </div>
        <div className="w-1/2 p-1 md:w-1/5">
          <GroupOption
            name={t('Authenticated')}
            description={t('Only people that are authenticated')}
            value={{ requiredSecurityGroup: SecurityGroupType.Authenticated }}
          />
        </div>
        <div className="w-1/2 p-1 md:w-1/5">
          <GroupOption
            name={t('Public')}
            description={t('Accessible by everyone on the internet')}
            value={{ requiredSecurityGroup: SecurityGroupType.Anonymous }}
          />
        </div>
      </div>
    </>
  );
};

export default AclWizard;
