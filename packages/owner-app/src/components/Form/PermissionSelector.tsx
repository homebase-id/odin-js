import { PermissionSet } from '@youfoundation/js-lib/core';
import { t, CheckboxToggle } from '@youfoundation/common-app';
import { Persons } from '@youfoundation/common-app/icons';

import {
  AppPermissionType,
  AppCirclePermissionType,
  CirclePermissionType,
} from '@youfoundation/js-lib/network';

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
      ? AppPermissionType
      : type === 'app-circles'
        ? AppCirclePermissionType
        : CirclePermissionType;
  const numericLevels = Object.values(levels).filter((v) => typeof v === 'number') as number[];

  return (
    <>
      {numericLevels?.length ? (
        <div className="-mb-2">
          {numericLevels
            .filter((level) => level > 1)
            .map((permissionLevel) => {
              const isChecked =
                permissionSet && permissionSet.keys?.some((key) => key === permissionLevel);
              const clickHandler = () => {
                if (isChecked) {
                  onChange({
                    keys: [...permissionSet.keys.filter((key) => key !== permissionLevel)],
                  });
                } else {
                  onChange({ keys: [...(permissionSet?.keys || []), permissionLevel] });
                }
              };

              return (
                <div
                  key={`${permissionLevel}`}
                  className={`my-2 flex w-full cursor-pointer select-none flex-row items-center rounded-lg border px-4 py-3 dark:border-slate-800 ${
                    isChecked ? 'bg-slate-50 dark:bg-slate-700' : 'bg-white dark:bg-black'
                  }`}
                  onClick={clickHandler}
                >
                  <Persons className="mb-auto mr-3 mt-1 h-6 w-6" />
                  <p className={`leading-none`}>{t(levels[permissionLevel])}</p>
                  <CheckboxToggle
                    id={t(levels[permissionLevel])}
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
