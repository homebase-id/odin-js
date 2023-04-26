import { appPermissionLevels } from '../../../provider/permission/permissionLevels';
import Persons from '../../ui/Icons/Persons/Persons';

const PermissionView = ({ permission, className }: { permission: number; className?: string }) => {
  const permissionLevel = appPermissionLevels.find((level) => level.value === permission);

  return (
    <div key={`${permissionLevel?.value}`} className={`flex flex-row ${className}`}>
      <Persons className="mt-1 mb-auto mr-3 h-6 w-6" />
      <div className="flex flex-col">
        <p className={`my-auto leading-none`}>{permissionLevel?.name}</p>
      </div>
    </div>
  );
};

export default PermissionView;
