import {
  BuiltInAttributes,
  MinimalProfileFields,
  LocationFields,
  PhoneFields,
  BirthdayFields,
  GetTargetDriveFromProfileId,
  BuiltInProfiles,
  EmailFields,
} from '@youfoundation/js-lib/profile';

import { ApiType, DotYouClient } from '@youfoundation/js-lib/core';
import {
  getProfileAttributesOverTransit,
  getDecryptedImageDataOverTransit,
} from '@youfoundation/js-lib/transit';
import { uint8ArrayToBase64 } from '@youfoundation/js-lib/helpers';
import { GetFile } from '@youfoundation/js-lib/public';
import { RawContact, getDetailedConnectionInfo } from '@youfoundation/js-lib/network';

//Handles fetching and parsing of Contact Source data

export const fetchConnectionInfo = async (
  dotYouClient: DotYouClient,
  odinId: string
): Promise<RawContact | undefined> => {
  const [connectionContactData, contactFromTransit] = await Promise.all([
    getDetailedConnectionInfo(dotYouClient, odinId, true),
    queryRemoteAttributes(dotYouClient, odinId),
  ]);

  return {
    odinId,
    name:
      contactFromTransit?.name ||
      (connectionContactData?.contactData?.name
        ? {
            displayName: connectionContactData.contactData.name,
          }
        : undefined),
    image:
      contactFromTransit?.image ||
      (connectionContactData?.contactData?.imageId
        ? await getPhotoDataFromPublic(odinId, connectionContactData.contactData.imageId)
        : undefined),
    ...contactFromTransit,
    source: connectionContactData?.status === 'connected' ? 'contact' : 'public',
  };
};

export const queryRemoteAttributes = async (
  dotYouClient: DotYouClient,
  odinId: string
): Promise<RawContact | undefined> => {
  try {
    const [name, phone, email, location, birthday, photo] = await Promise.all([
      (await getProfileAttributesOverTransit(dotYouClient, odinId, BuiltInAttributes.Name))?.[0],
      (
        await getProfileAttributesOverTransit(dotYouClient, odinId, BuiltInAttributes.PhoneNumber)
      )?.[0],
      (await getProfileAttributesOverTransit(dotYouClient, odinId, BuiltInAttributes.Email))?.[0],
      (await getProfileAttributesOverTransit(dotYouClient, odinId, BuiltInAttributes.Address))?.[0],
      (
        await getProfileAttributesOverTransit(dotYouClient, odinId, BuiltInAttributes.Birthday)
      )?.[0],
      (await getProfileAttributesOverTransit(dotYouClient, odinId, BuiltInAttributes.Photo))?.[0],
    ]);

    return {
      source: 'public',
      odinId,
      name: {
        displayName: name?.data?.[MinimalProfileFields.DisplayName],
        additionalName: name?.data?.[MinimalProfileFields.AdditionalName],
        givenName: name?.data?.[MinimalProfileFields.GivenNameId],
        surname: name?.data?.[MinimalProfileFields.SurnameId],
      },
      location: {
        city: location?.data?.[LocationFields.City],
        country: location?.data?.[LocationFields.Country],
      },
      phone: { number: phone?.data?.[PhoneFields.PhoneNumber] },
      email: { email: email?.data?.[EmailFields.Email] },
      birthday: { date: birthday?.data?.[BirthdayFields.Date] },
      image: photo
        ? (await queryConnectionPhotoData(
            dotYouClient,
            odinId,
            photo.data[MinimalProfileFields.ProfileImageId]
          )) || undefined
        : undefined,
    };
  } catch (ex) {
    return undefined;
  }
};

export const queryConnectionPhotoData = async (
  dotYouClient: DotYouClient,
  odinId: string,
  profileImageId: string
) => {
  const imageData = await getDecryptedImageDataOverTransit(
    dotYouClient,
    odinId,
    GetTargetDriveFromProfileId(BuiltInProfiles.StandardProfileId),
    profileImageId
  );

  if (!imageData) return null;

  return {
    pixelWidth: imageData.pixelWidth || 100,
    pixelHeight: imageData.pixelHeight || 100,
    contentType: imageData.contentType || 'image/jpeg',
    content: uint8ArrayToBase64(new Uint8Array(imageData.content)),
  };
};

export const fetchDataFromPublic = async (odinId: string): Promise<RawContact | undefined> => {
  const client = new DotYouClient({ api: ApiType.Guest, identity: odinId });
  const rawData = await GetFile(client, 'public.json');

  const nameAttr = rawData?.get('name')?.[0];
  const photoRefAttr = rawData?.get('photo')?.[0];
  const photoFile = rawData?.get(photoRefAttr?.payload?.data?.profileImageId)?.[0] ?? undefined;

  const previewThumbnail = photoFile?.additionalThumbnails?.reduce(
    (prevVal, curValue) => {
      if (prevVal.pixelWidth < curValue.pixelWidth && curValue.pixelWidth <= 250) {
        return curValue;
      }
      return prevVal;
    },
    { ...photoFile.header.fileMetadata.appData.previewThumbnail, pixelWidth: 20, pixelHeight: 20 }
  );

  return {
    name:
      nameAttr?.payload.data.givenName || nameAttr?.payload.data.surname
        ? {
            displayName: nameAttr?.payload.data[MinimalProfileFields.DisplayName],
            givenName: nameAttr?.payload.data[MinimalProfileFields.GivenNameId],
            surname: nameAttr?.payload.data[MinimalProfileFields.SurnameId],
          }
        : undefined,
    image: previewThumbnail?.content
      ? {
          pixelWidth: previewThumbnail.pixelWidth,
          pixelHeight: previewThumbnail.pixelHeight,
          contentType: previewThumbnail.contentType || 'image/jpeg',
          content: previewThumbnail.content.toString(),
        }
      : undefined,
    source: 'public',
  };
};

export const getPhotoDataFromPublic = async (odinId: string, imageFileId: string) => {
  const client = new DotYouClient({ api: ApiType.Guest, identity: odinId });
  const rawData = await GetFile(client, 'public.json');

  const photoData = rawData?.get(imageFileId)?.[0];

  if (!photoData) return;

  const previewThumbnail = photoData.additionalThumbnails?.reduce(
    (prevVal, curValue) => {
      if (prevVal.pixelWidth < curValue.pixelWidth && curValue.pixelWidth <= 250) {
        return curValue;
      }
      return prevVal;
    },
    { ...photoData.header.fileMetadata.appData.previewThumbnail, pixelWidth: 20, pixelHeight: 20 }
  );
  if (!previewThumbnail || !previewThumbnail.content) return;

  return {
    pixelWidth: previewThumbnail.pixelWidth,
    pixelHeight: previewThumbnail.pixelHeight,
    contentType: previewThumbnail.contentType || 'image/jpeg',
    content: previewThumbnail.content.toString(),
  };
};
