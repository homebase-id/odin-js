import {
  BuiltInProfiles,
  BuiltInAttributes,
  MinimalProfileFields,
  GetTargetDriveFromProfileId,
  Attribute,
} from '@youfoundation/js-lib/profile';
import { useAttributeVersions } from '../../../hooks/profiles/useAttributeVersions';
import { FallbackImg, LoadingBlock, useImage } from '@youfoundation/common-app';
import { DriveSearchResult, SecurityGroupType } from '@youfoundation/js-lib/core';
import { getInitialsOfNameAttribute } from '@youfoundation/js-lib/helpers';

interface YourSignatureProps {
  className?: string;
}

const filterAttributes = (attributes: DriveSearchResult<Attribute>[]) => {
  return attributes
    ?.filter(
      (attr) =>
        attr.fileMetadata.appData.content.data !== undefined &&
        Object.keys(attr.fileMetadata.appData.content.data)?.length !== 0 &&
        attr.serverMetadata?.accessControlList.requiredSecurityGroup === SecurityGroupType.Anonymous
    )
    ?.sort((attrA, attrB) => attrA.priority - attrB.priority);
};

const YourSignature = ({ className }: YourSignatureProps) => {
  const { data: nameAttributes, isLoading: nameAttributesLoading } = useAttributeVersions({
    profileId: BuiltInProfiles.StandardProfileId.toString(),
    type: BuiltInAttributes.Name,
  }).fetchVersions;

  const filteredNameAttributes = filterAttributes(nameAttributes || []);

  const { data: photoAttributes, isLoading: photoAttributesLoading } = useAttributeVersions({
    profileId: BuiltInProfiles.StandardProfileId.toString(),
    type: BuiltInAttributes.Photo,
  }).fetchVersions;

  const filteredPhotoAttributes = filterAttributes(photoAttributes || []);

  const { data: imageData } = useImage({
    imageFileId: filteredPhotoAttributes?.[0]?.fileId,
    imageFileKey:
      filteredPhotoAttributes?.[0]?.fileMetadata.appData.content.data?.[
        MinimalProfileFields.ProfileImageKey
      ],
    imageDrive: GetTargetDriveFromProfileId(BuiltInProfiles.StandardProfileId.toString()),
  }).fetch;
  const imageUrl = imageData?.url;

  const name =
    filteredNameAttributes?.[0]?.fileMetadata.appData.content.data[
      MinimalProfileFields.DisplayName
    ];
  const initials = getInitialsOfNameAttribute(
    filteredNameAttributes?.[0]?.fileMetadata.appData.content
  );

  return (
    <div className={`${className ?? ''}`}>
      <div className="-mr-3 flex flex-row ">
        <div className="aspect-square w-1/4 max-w-[3rem]">
          {photoAttributesLoading ? (
            <LoadingBlock className={`aspect-square`} />
          ) : !imageUrl ? (
            <FallbackImg
              initials={initials}
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
              {name}
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
