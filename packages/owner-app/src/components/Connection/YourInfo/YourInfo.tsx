import {
  BuiltInProfiles,
  BuiltInAttributes,
  MinimalProfileFields,
  GetTargetDriveFromProfileId,
  AttributeFile,
  BirthdayFields,
  PhoneFields,
  LocationFields,
} from '@youfoundation/js-lib/profile';
import { SecurityGroupType } from '@youfoundation/js-lib/core';
import { getInitialsOfNameAttribute, stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { useEffect } from 'react';
import { t } from '@youfoundation/common-app';
import useImage from '../../../hooks/media/useImage';
import useAttributeVersions from '../../../hooks/profiles/useAttributeVersions';
import FallbackImg from '../../ui/FallbackImg/FallbackImg';
import { LoadingBlock, Cake, House, IconFrame, Phone } from '@youfoundation/common-app';
import InfoBox from '../../ui/InfoBox/InfoBox';

interface infoObject {
  name: string;
  initials: string;
  imageFileId: string;
  phone: string;
  city: string;
  country: string;
  birthday: string;
}

interface YourInfoProps {
  circleGrants?: string[];
  className?: string;
  onChange?: ({ name, initials, phone, city, country, birthday }: infoObject) => void;
}

const filterAttributesWithCircleGrants = (attributes: AttributeFile[], circleGrants: string[]) => {
  return attributes
    ?.filter(
      (attr) =>
        attr.data !== undefined &&
        Object.keys(attr.data)?.length !== 0 &&
        attr.acl.requiredSecurityGroup !== SecurityGroupType.Owner
    )
    ?.sort((attrA, attrB) => attrA.priority - attrB.priority)
    ?.filter((attr) =>
      attr.acl?.circleIdList?.length
        ? attr.acl.circleIdList.some((allowedCircleId) =>
            circleGrants?.some((circleGrantId) => stringGuidsEqual(circleGrantId, allowedCircleId))
          )
        : true
    );
};

const YourInfo = ({ circleGrants, className, onChange }: YourInfoProps) => {
  const {
    data: nameAttributes,
    isLoading: nameAttributesLoading,
    isFetchedAfterMount: isFetchedAfterMount,
  } = useAttributeVersions({
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

  const { data: imageUrl } = useImage(
    filteredPhotoAttributes?.[0]?.data?.[MinimalProfileFields.ProfileImageId],
    GetTargetDriveFromProfileId(BuiltInProfiles.StandardProfileId.toString())
  ).fetch;

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

  const info: infoObject = {
    name: filteredNameAttributes?.[0]?.data[MinimalProfileFields.DisplayName],
    initials: getInitialsOfNameAttribute(filteredNameAttributes?.[0]),
    imageFileId: filteredPhotoAttributes?.[0]?.data[MinimalProfileFields.ProfileImageId],
    phone: filteredPhoneAttributes?.[0]?.data[PhoneFields.PhoneNumber],
    city: filteredLocationAttributes?.[0]?.data[LocationFields.City],
    country: filteredLocationAttributes?.[0]?.data[LocationFields.Country],
    birthday: filteredBirtydayAttributes?.[0]?.data[BirthdayFields.Date],
  };

  useEffect(() => {
    if (filteredNameAttributes?.length && onChange && typeof onChange === 'function') {
      onChange(info);
    }
  }, [isFetchedAfterMount]);

  return (
    <div className={`relative border border-slate-100 dark:border-slate-800 ${className ?? ''}`}>
      <div className="flex flex-row ">
        <div className="aspect-square w-1/4 max-w-[10rem]">
          {photoAttributesLoading ? (
            <LoadingBlock className={`aspect-square`} />
          ) : !imageUrl ? (
            <FallbackImg
              initials={info.initials}
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
            <h2 className="mb-4 text-lg">{info.name ?? window.location.host}</h2>
          )}
          {phoneAttributesLoading ? (
            <LoadingBlock className="h-6 w-full max-w-xs" />
          ) : (
            <div className="my-1 flex flex-row">
              <IconFrame className="mr-2">
                <Phone className="h-3 w-3" />
              </IconFrame>{' '}
              {info.phone ? (
                info.phone
              ) : (
                <span className="font-light text-slate-400">{t('unknown')}</span>
              )}
            </div>
          )}
          {locationAttributesLoading ? (
            <LoadingBlock className="h-6 w-full max-w-xs" />
          ) : (
            <div className="my-1 flex flex-row">
              <IconFrame className="mr-2">
                <House className="h-3 w-3" />
              </IconFrame>{' '}
              {!info.city && !info.country ? (
                <span className="font-light text-slate-400">{t('unknown')}</span>
              ) : (
                <>
                  {info.city}
                  {info.city && ', '}
                  {info.country}
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
              {info.birthday ? (
                info.birthday
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
