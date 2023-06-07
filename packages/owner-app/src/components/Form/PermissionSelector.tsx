import { PermissionSet } from '@youfoundation/js-lib/core';
import {
  appPermissionLevels,
  circlePermissionLevels,
} from '../../provider/permission/permissionLevels';
import { Persons } from '@youfoundation/common-app';
import CheckboxToggle from './CheckboxToggle';

const PermissionSelector = ({
  type,
  permissionSet,
  onChange,
}: {
  type: 'app' | 'circle' | 'app-circles';
  permissionSet: PermissionSet | undefined;
  onChange: (val: PermissionSet) => void;
}) => {
  const levels =
    type === 'app'
      ? appPermissionLevels
      : type === 'app-circles'
      ? appPermissionLevels.filter((level) => level.value !== 30)
      : circlePermissionLevels;

  return (
    <>
      {levels?.length ? (
        <div className="-mb-2">
          {levels
            .filter((level) => level.value > 1)
            .map((permissionLevel) => {
              const isChecked =
                permissionSet && permissionSet.keys?.some((key) => key === permissionLevel.value);
              const clickHandler = () => {
                if (isChecked) {
                  onChange({
                    keys: [...permissionSet.keys.filter((key) => key !== permissionLevel.value)],
                  });
                } else {
                  onChange({ keys: [...(permissionSet?.keys || []), permissionLevel.value] });
                }
              };

              return (
                <div
                  key={`${permissionLevel?.value}`}
                  className={`my-2 flex w-full cursor-pointer select-none flex-row items-center rounded-lg border px-4 py-3 dark:border-slate-800 ${
                    isChecked ? 'bg-slate-50 dark:bg-slate-700' : 'bg-white dark:bg-black'
                  }`}
                  onClick={clickHandler}
                >
                  <Persons className="mb-auto mr-3 mt-1 h-6 w-6" />
                  <p className={`leading-none`}>{permissionLevel?.name}</p>
                  <CheckboxToggle
                    id={permissionLevel?.name}
                    checked={isChecked}
                    className="pointer-events-none my-auto ml-auto"
                    readOnly={true}
                  />
                </div>
              );
            })}
        </div>
      ) : null}
    </>
  );
};

export default PermissionSelector;
