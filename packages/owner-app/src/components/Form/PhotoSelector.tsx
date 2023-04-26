import {
  BuiltInAttributes,
  BuiltInProfiles,
  GetTargetDriveFromProfileId,
  MinimalProfileFields,
  SecurityGroupType,
} from '@youfoundation/js-lib';
import useImage from '../../hooks/media/useImage';
import useAttributeVersions from '../../hooks/profiles/useAttributeVersions';
import FallbackImg from '../ui/FallbackImg/FallbackImg';

const PhotoSelector = ({
  defaultValue,
  onChange,
  id,
  className,
  fallbackInitials,
}: {
  defaultValue: string;
  onChange: (e: { target: { value: string } }) => void;
  id?: string;
  className?: string;
  fallbackInitials?: string;
}) => {
  const { data: photoAttributes, isLoading: photoAttributesLoading } = useAttributeVersions({
    profileId: BuiltInProfiles.StandardProfileId.toString(),
    type: BuiltInAttributes.Photo,
  }).fetchVersions;

  const filteredPhotoAttributes = photoAttributes?.filter(
    (attr) =>
      attr.data !== undefined &&
      Object.keys(attr.data).length !== 0 &&
      attr.acl?.requiredSecurityGroup === SecurityGroupType.Anonymous
  );

  return (
    <ul
      id={id}
      className={`flex w-full flex-row flex-wrap rounded border border-gray-300 bg-white p-2 text-base leading-8 text-gray-700 outline-none transition-colors duration-200 ease-in-out focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 ${className}`}
    >
      {photoAttributesLoading && <li className="w-full p-3">Loading...</li>}

      <Option
        onClick={() => {
          onChange({
            target: { value: undefined },
          });
        }}
        key={'empty'}
        value={fallbackInitials}
        isActive={!defaultValue}
      />

      {filteredPhotoAttributes?.map((attr) => {
        return (
          <Option
            onClick={(newValue) => {
              onChange({
                target: { value: newValue },
              });
            }}
            key={attr.id}
            value={attr.data[MinimalProfileFields.ProfileImageId]}
            isActive={defaultValue === attr.data[MinimalProfileFields.ProfileImageId]}
          />
        );
      })}
    </ul>
  );
};

const Option = ({
  value,
  onClick,
  isActive,
}: {
  value: string;
  onClick?: (value: string) => void;
  isActive: boolean;
}) => {
  const { data: imageUrl } = useImage(
    value?.length > 2 ? value : undefined,
    GetTargetDriveFromProfileId(BuiltInProfiles.StandardProfileId.toString())
  ).fetch;

  return (
    <li
      onClick={() => {
        onClick && onClick(isActive ? undefined : value);
      }}
      className={`mr-1 cursor-pointer list-none rounded-lg border-[3px] p-[1px] ${
        isActive
          ? 'overflow-hidden border-indigo-500 dark:border-indigo-700'
          : 'border-transparent hover:border-slate-100'
      } `}
      key={value}
    >
      {!imageUrl ? (
        <FallbackImg
          initials={value ?? '?'}
          className="aspect-square h-[5rem] w-[5rem] rounded-md sm:text-4xl"
        />
      ) : (
        <img src={imageUrl} className="max-h-[5rem] rounded-md" />
      )}
    </li>
  );
};

export default PhotoSelector;
