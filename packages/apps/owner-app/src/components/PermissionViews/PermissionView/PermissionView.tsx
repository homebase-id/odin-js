import { t } from '@homebase-id/common-app';
import { Persons } from '@homebase-id/common-app/icons';
import { getPermissionKeyName } from '@homebase-id/js-lib/helpers';

const PermissionView = ({ permission, className }: { permission: number; className?: string }) => {
  // getPermissionKeyName rather than AppPermissionType: that enum covers only the keys an app may
  // request, so a key outside it (ManageCircleMembership, ManageProfile, SendOnBehalfOfOwner,
  // AllowIntroductions) indexed to undefined and rendered as an empty row.
  const permissionLevel = getPermissionKeyName(permission);

  return (
    <div key={`${permissionLevel}`} className={`flex flex-row ${className}`}>
      <Persons className="mb-auto mr-3 mt-1 h-6 w-6" />
      <div className="flex flex-col">
        <p className={`my-auto leading-none`}>{t(permissionLevel)}</p>
      </div>
    </div>
  );
};

export default PermissionView;
