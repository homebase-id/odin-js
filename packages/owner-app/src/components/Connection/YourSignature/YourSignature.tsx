import {
  BuiltInProfiles,
  BuiltInAttributes,
  MinimalProfileFields,
  GetTargetDriveFromProfileId,
  AttributeFile,
} from '@youfoundation/js-lib/profile';
import { useEffect } from 'react';
import { useImage } from '../../../hooks/media/useImage';
import { useAttributeVersions } from '../../../hooks/profiles/useAttributeVersions';
import { FallbackImg, LoadingBlock } from '@youfoundation/common-app';
import { DEFAULT_PAYLOAD_KEY, SecurityGroupType } from '@youfoundation/js-lib/core';
import { getInitialsOfNameAttribute } from '@youfoundation/js-lib/helpers';

interface infoObject {
  name: string;
  initials: string;
  imageFileId: string;
}

interface YourSignatureProps {
  className?: string;
  onChange?: ({ name, imageFileId }: infoObject) => void;
}

const filterAttributes = (attributes: AttributeFile[]) => {
  return attributes
    ?.filter(
      (attr) =>
        attr.data !== undefined &&
        Object.keys(attr.data)?.length !== 0 &&
        attr.acl.requiredSecurityGroup === SecurityGroupType.Anonymous
    )
    ?.sort((attrA, attrB) => attrA.priority - attrB.priority);
};

const YourSignature = ({ className, onChange }: YourSignatureProps) => {
  const {
    data: nameAttributes,
    isLoading: nameAttributesLoading,
    isFetchedAfterMount: isNameFetchedAfterMount,
  } = useAttributeVersions({
    profileId: BuiltInProfiles.StandardProfileId.toString(),
    type: BuiltInAttributes.Name,
  }).fetchVersions;

  const filteredNameAttributes = filterAttributes(nameAttributes || []);

  const {
    data: photoAttributes,
    isLoading: photoAttributesLoading,
    isFetchedAfterMount: isPhotoFetchedAfterMount,
  } = useAttributeVersions({
    profileId: BuiltInProfiles.StandardProfileId.toString(),
    type: BuiltInAttributes.Photo,
  }).fetchVersions;

  const filteredPhotoAttributes = filterAttributes(photoAttributes || []);

  const { data: imageUrl } = useImage(
    filteredPhotoAttributes?.[0]?.fileId,
    filteredPhotoAttributes?.[0]?.data?.[MinimalProfileFields.ProfileImageKey],
    GetTargetDriveFromProfileId(BuiltInProfiles.StandardProfileId.toString())
  ).fetch;

  const info: infoObject = {
    name: filteredNameAttributes?.[0]?.data[MinimalProfileFields.DisplayName],
    initials: getInitialsOfNameAttribute(filteredNameAttributes?.[0]),
    imageFileId: filteredPhotoAttributes?.[0]?.data[MinimalProfileFields.ProfileImageKey],
  };

  useEffect(() => {
    if (filteredNameAttributes?.length && onChange) {
      onChange(info);
    }
  }, [isNameFetchedAfterMount, isPhotoFetchedAfterMount]);

  return (
    <div className={`${className ?? ''}`}>
      <div className="-mr-3 flex flex-row ">
        <div className="aspect-square w-1/4 max-w-[3rem]">
          {photoAttributesLoading ? (
            <LoadingBlock className={`aspect-square`} />
          ) : !imageUrl ? (
            <FallbackImg
              initials={info.initials}
              className="aspect-square h-[3rem] w-[3rem] sm:text-4xl"
            />
          ) : (
            <img src={imageUrl} className="aspect-square object-cover object-top" />
          )}
        </div>
        <div className="my-auto flex-grow px-3">
          {nameAttributesLoading ? (
            <LoadingBlock className="h-6 w-full max-w-xs" />
          ) : (
            <h2 className="text-lg leading-tight">
              {info.name}
              <small className="block text-slate-400 dark:text-slate-600">
                {window.location.hostname}
              </small>
            </h2>
          )}
        </div>
      </div>
    </div>
  );
};

export default YourSignature;
