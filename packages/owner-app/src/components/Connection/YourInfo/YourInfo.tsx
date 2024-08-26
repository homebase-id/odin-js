import {
  BuiltInProfiles,
  BuiltInAttributes,
  MinimalProfileFields,
  GetTargetDriveFromProfileId,
  BirthdayFields,
  PhoneFields,
  LocationFields,
  Attribute,
} from '@youfoundation/js-lib/profile';
import { HomebaseFile, SecurityGroupType } from '@youfoundation/js-lib/core';
import { getInitialsOfNameAttribute, stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { LoadingBlock, FallbackImg, t, useImage } from '@youfoundation/common-app';
import { useAttributeVersions } from '../../../hooks/profiles/useAttributeVersions';
import { Cake, House, IconFrame, Phone } from '@youfoundation/common-app/icons';
import InfoBox from '../../ui/InfoBox/InfoBox';

interface YourInfoProps {
  circleGrants?: string[];
  className?: string;
}

const filterAttributesWithCircleGrants = (
  attributes: HomebaseFile<Attribute>[],
  circleGrants: string[]
) => {
  return attributes
    ?.filter(
      (attr) =>
        attr.fileMetadata.appData.content.data !== undefined &&
        Object.keys(attr.fileMetadata.appData.content.data)?.length !== 0 &&
        attr.serverMetadata?.accessControlList.requiredSecurityGroup !== SecurityGroupType.Owner
    )
    ?.sort((attrA, attrB) => attrA.priority - attrB.priority)
    ?.filter((attr) =>
      attr.serverMetadata?.accessControlList?.circleIdList?.length
        ? attr.serverMetadata?.accessControlList.circleIdList.some((allowedCircleId) =>
            circleGrants?.some((circleGrantId) => stringGuidsEqual(circleGrantId, allowedCircleId))
          )
        : true
    );
};

const YourInfo = ({ circleGrants, className }: YourInfoProps) => {
  const { data: nameAttributes, isLoading: nameAttributesLoading } = useAttributeVersions({
    profileId: BuiltInProfiles.StandardProfileId.toString(),
    type: BuiltInAttributes.Name,
  }).fetchVersions;

  const filteredNameAttributes = filterAttributesWithCircleGrants(
    nameAttributes || [],
    circleGrants || []
  );

  const { data: photoAttributes, isLoading: photoAttributesLoading } = useAttributeVersions({
    profileId: BuiltInProfiles.StandardProfileId.toString(),
    type: BuiltInAttributes.Photo,
  }).fetchVersions;

  const filteredPhotoAttributes = filterAttributesWithCircleGrants(
    photoAttributes || [],
    circleGrants || []
  );

  const { data: imageData } = useImage({
    imageFileId: filteredPhotoAttributes?.[0]?.fileId,
    imageFileKey:
      filteredPhotoAttributes?.[0]?.fileMetadata.appData.content.data?.[
        MinimalProfileFields.ProfileImageKey
      ],
    imageDrive: GetTargetDriveFromProfileId(BuiltInProfiles.StandardProfileId.toString()),
  }).fetch;
  const imageUrl = imageData?.url;

  const { data: phoneAttributes, isLoading: phoneAttributesLoading } = useAttributeVersions({
    profileId: BuiltInProfiles.StandardProfileId.toString(),
    type: BuiltInAttributes.PhoneNumber,
  }).fetchVersions;

  const filteredPhoneAttributes = filterAttributesWithCircleGrants(
    phoneAttributes || [],
    circleGrants || []
  );

  const { data: locationAttributes, isLoading: locationAttributesLoading } = useAttributeVersions({
    profileId: BuiltInProfiles.StandardProfileId.toString(),
    type: BuiltInAttributes.Address,
  }).fetchVersions;

  const filteredLocationAttributes = filterAttributesWithCircleGrants(
    locationAttributes || [],
    circleGrants || []
  );

  const { data: birtydayAttributes, isLoading: birtydayAttributesLoading } = useAttributeVersions({
    profileId: BuiltInProfiles.StandardProfileId.toString(),
    type: BuiltInAttributes.Birthday,
  }).fetchVersions;

  const filteredBirtydayAttributes = filterAttributesWithCircleGrants(
    birtydayAttributes || [],
    circleGrants || []
  );

  const name =
    filteredNameAttributes?.[0]?.fileMetadata.appData.content.data?.[
      MinimalProfileFields.DisplayName
    ];
  const initials = getInitialsOfNameAttribute(
    filteredNameAttributes?.[0]?.fileMetadata.appData.content
  );
  const phone =
    filteredPhoneAttributes?.[0]?.fileMetadata.appData.content.data?.[PhoneFields.PhoneNumber];
  const city =
    filteredLocationAttributes?.[0]?.fileMetadata.appData.content.data?.[LocationFields.City];
  const country =
    filteredLocationAttributes?.[0]?.fileMetadata.appData.content.data?.[LocationFields.Country];
  const birthday =
    filteredBirtydayAttributes?.[0]?.fileMetadata.appData.content.data?.[BirthdayFields.Date];

  return (
    <div className={`relative border border-slate-100 dark:border-slate-800 ${className ?? ''}`}>
      <div className="flex flex-row ">
        <div className="aspect-square w-1/4 max-w-[10rem]">
          {photoAttributesLoading ? (
            <LoadingBlock className={`aspect-square`} />
          ) : !imageUrl ? (
            <FallbackImg
              initials={initials}
              className="aspect-square h-[8rem] w-[8rem] sm:text-4xl"
            />
          ) : (
            <img src={imageUrl} className="aspect-square object-cover object-top" />
          )}
        </div>
        <div className="flex-grow px-6 py-4">
          {nameAttributesLoading ? (
            <LoadingBlock className="h-6 w-full max-w-xs" />
          ) : (
            <h2 className="mb-4 text-lg">{name ?? window.location.host}</h2>
          )}
          {phoneAttributesLoading ? (
            <LoadingBlock className="h-6 w-full max-w-xs" />
          ) : (
            <div className="my-1 flex flex-row">
              <IconFrame className="mr-2">
                <Phone className="h-3 w-3" />
              </IconFrame>{' '}
              {phone ? phone : <span className="font-light text-slate-400">{t('unknown')}</span>}
            </div>
          )}
          {locationAttributesLoading ? (
            <LoadingBlock className="h-6 w-full max-w-xs" />
          ) : (
            <div className="my-1 flex flex-row">
              <IconFrame className="mr-2">
                <House className="h-3 w-3" />
              </IconFrame>{' '}
              {!city && !country ? (
                <span className="font-light text-slate-400">{t('unknown')}</span>
              ) : (
                <>
                  {city}
                  {city && ', '}
                  {country}
                </>
              )}
            </div>
          )}
          {birtydayAttributesLoading ? (
            <LoadingBlock className="h-6 w-full max-w-xs" />
          ) : (
            <div className="my-1 flex flex-row">
              <IconFrame className="mr-2">
                <Cake className="h-3 w-3" />
              </IconFrame>{' '}
              {birthday ? (
                birthday
              ) : (
                <span className="font-light text-slate-400">{t('unknown')}</span>
              )}
            </div>
          )}
        </div>
        <InfoBox title={t('Why am I seeing this?')} className="absolute bottom-1 right-1">
          <p className="mb-4">
            {t(
              'Based on the list of circles that a connection belongs to, certain access to your profile attributes (as you can specifiy yourself) are provided.'
            )}
          </p>
          <p className="">
            {t(
              'The contact info shown here is just a sample of the data the conection will be able to access.'
            )}
          </p>
        </InfoBox>
      </div>
    </div>
  );
};

export default YourInfo;
