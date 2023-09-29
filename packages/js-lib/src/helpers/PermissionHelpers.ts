import { DrivePermissionType, AppPermissionType } from '../network/permission/PermissionTypes';

const getPermissionFromNumber = (
  value: number,
  levels: typeof DrivePermissionType | typeof AppPermissionType
): { name: string; value: number } => {
  const directMatch = DrivePermissionType[value];
  if (directMatch) return { name: directMatch, value: value };

  const numericLevels = Object.values(levels).filter((v) => typeof v === 'number') as number[];

  const numericMatch = numericLevels.reduce((prevValue, currValue) => {
    if (currValue > prevValue && currValue <= value) {
      return currValue;
    }

    return prevValue;
  }, numericLevels[0]);

  return { name: levels[numericMatch], value: numericMatch };
};

export const getDrivePermissionFromNumber = (value: number) =>
  getPermissionFromNumber(value, DrivePermissionType);

export const getAppPermissionFromNumber = (value: number) =>
  getPermissionFromNumber(value, AppPermissionType);
