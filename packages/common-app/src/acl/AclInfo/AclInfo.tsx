import { AccessControlList, SecurityGroupType } from '@homebase-id/js-lib/core';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { useCircles } from '../../hooks/circles/useCircles';
import { t } from '../../helpers/i18n/dictionary';
import { ellipsisAtMaxChar } from '../../helpers/common';
import { OpenLock } from '../../ui/Icons/OpenLock';
import { Lock } from '../../ui/Icons/Lock';

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
          : acl.requiredSecurityGroup.toLowerCase() ===
              SecurityGroupType.AutoConnected.toLowerCase()
            ? t('Auto Connected')
            : acl.requiredSecurityGroup.toLowerCase() ===
                SecurityGroupType.ConfirmConnected.toLowerCase()
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
