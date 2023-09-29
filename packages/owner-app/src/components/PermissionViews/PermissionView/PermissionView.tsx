import { Persons, t } from '@youfoundation/common-app';
import { AppPermissionLevels } from '@youfoundation/js-lib/network';

const PermissionView = ({ permission, className }: { permission: number; className?: string }) => {
  const permissionLevel = AppPermissionLevels[permission];

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
