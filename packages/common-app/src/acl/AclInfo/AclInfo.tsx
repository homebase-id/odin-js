import { AccessControlList, SecurityGroupType } from '@youfoundation/js-lib/core';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { ellipsisAtMaxChar } from '@youfoundation/common-app';
import { t } from '@youfoundation/common-app';
import { Lock, OpenLock, useCircles } from '@youfoundation/common-app';

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
