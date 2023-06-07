import { AccessControlList, SecurityGroupType } from '@youfoundation/js-lib/core';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { useState } from 'react';
import { ellipsisAtMaxChar } from '@youfoundation/common-app';
import { t } from '@youfoundation/common-app';
import { Lock, OpenLock } from '@youfoundation/common-app';
import { useCircles } from '@youfoundation/common-app';
import AclDialog from '../AclDialog/AclDialog';

export const AclSummary = ({
  acl,
  maxLength = 40,
}: {
  acl: AccessControlList;
  maxLength?: number;
}) => {
  const { data: circles } = useCircles().fetch;

  const circlesDetails = acl?.circleIdList?.map(
    (circleId) => circles?.find((circle) => stringGuidsEqual(circle.id || '', circleId))?.name
  );

  return (
    <>
      {!acl || acl.requiredSecurityGroup.toLowerCase() === SecurityGroupType.Anonymous.toLowerCase()
        ? t('Public')
        : acl.requiredSecurityGroup.toLowerCase() === SecurityGroupType.Authenticated.toLowerCase()
        ? t('Authenticated')
        : acl.requiredSecurityGroup.toLowerCase() === SecurityGroupType.Connected.toLowerCase()
        ? acl.circleIdList?.length
          ? `${t('Circles')}: ${ellipsisAtMaxChar(circlesDetails?.join(', '), maxLength)}`
          : t('Connections')
        : acl.requiredSecurityGroup.toLowerCase() === SecurityGroupType.Owner.toLowerCase()
        ? t('Owner')
        : t('Owner')}
    </>
  );
};

export const AclIcon = ({ acl, className }: { acl: AccessControlList; className: string }) => {
  return !acl ||
    acl.requiredSecurityGroup === SecurityGroupType.Anonymous.toLowerCase() ||
    acl.requiredSecurityGroup === SecurityGroupType.Authenticated.toLowerCase() ? (
    <OpenLock className={className} />
  ) : (
    <Lock className={className} />
  );
};

export const AclEditor = ({
  acl,
  onChange,
  isEdit,
  onClose,
  className,
}: {
  acl: AccessControlList;
  onChange?: (acl: AccessControlList) => void;
  isEdit?: boolean;
  onClose?: () => void;
  className?: string;
}) => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <>
      <button
        title={acl.requiredSecurityGroup}
        className={`mr-2 inline-block ${onChange ? '' : 'cursor-default'} ${className ?? ''}`}
        onClick={() => onChange && setIsEditing(true)}
      >
        <AclIcon className="h-5 w-5" acl={acl} />
      </button>
      <AclDialog
        acl={acl}
        isOpen={isEdit || isEditing}
        title={t('Edit security')}
        onCancel={() => {
          setIsEditing(false);
          onClose && onClose();
        }}
        onConfirm={(newAcl) => {
          onChange && onChange(newAcl);
          setIsEditing(false);
          onClose && onClose();
        }}
      />
    </>
  );
};
