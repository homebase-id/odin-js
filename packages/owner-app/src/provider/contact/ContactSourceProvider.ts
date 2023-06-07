import {
  BuiltInAttributes,
  MinimalProfileFields,
  LocationFields,
  PhoneFields,
  BirthdayFields,
  GetTargetDriveFromProfileId,
  BuiltInProfiles,
} from '@youfoundation/js-lib/profile';

import { RawContact } from './ContactTypes';
import { ApiType, DotYouClient } from '@youfoundation/js-lib/core';
import { getConnectionInfo, getPendingRequest } from '@youfoundation/js-lib/network';
import {
  getProfileAttributesOverTransit,
  getDecryptedImageDataOverTransit,
} from '@youfoundation/js-lib/transit';
import { uint8ArrayToBase64 } from '@youfoundation/js-lib/helpers';
import { GetFile } from '@youfoundation/js-lib/public';

//Handles fetching and parsing of Contact Source data

export const fetchConnectionInfo = async (
  dotYouClient: DotYouClient,
  odinId: string
): Promise<RawContact | undefined> => {
  const [connectionContactData, contactFromTransit] = await Promise.all([
    getConnectionInfo(dotYouClient, odinId, true),
    queryConnectionAttributes(dotYouClient, odinId),
  ]);

  if (connectionContactData) {
    if (connectionContactData?.originalContactData) {
      return {
        odinId,
        name: connectionContactData.originalContactData.name
          ? {
              displayName: connectionContactData.originalContactData.name,
            }
          : undefined,
        image: connectionContactData.originalContactData.imageId
          ? await getPhotoDataFromPublic(odinId, connectionContactData.originalContactData.imageId)
          : undefined,
        ...contactFromTransit,
        source: 'contact',
      };
    } else {
      return contactFromTransit;
    }
  }
};

export const queryConnectionAttributes = async (
  dotYouClient: DotYouClient,
  odinId: string
): Promise<RawContact | undefined> => {
  try {
    const [name, phone, location, birthday, photo] = await Promise.all([
      (await getProfileAttributesOverTransit(dotYouClient, odinId, BuiltInAttributes.Name))?.[0],
      (
        await getProfileAttributesOverTransit(dotYouClient, odinId, BuiltInAttributes.PhoneNumber)
      )?.[0],
      (await getProfileAttributesOverTransit(dotYouClient, odinId, BuiltInAttributes.Address))?.[0],
      (
        await getProfileAttributesOverTransit(dotYouClient, odinId, BuiltInAttributes.Birthday)
      )?.[0],
      (await getProfileAttributesOverTransit(dotYouClient, odinId, BuiltInAttributes.Photo))?.[0],
    ]);

    return {
      source: 'contact',
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

export const fetchPendingInfo = async (
  dotYouClient: DotYouClient,
  odinId: string,
  loadPicture: boolean
): Promise<RawContact | undefined> => {
  try {
    const pendingContactData = await getPendingRequest(dotYouClient, odinId);

    // TODO: Don't think this check should be needed; Pending request is also returning sent ones
    if (pendingContactData.senderOdinId === odinId) {
      if (pendingContactData?.contactData) {
        return {
          name: pendingContactData.contactData.name
            ? { displayName: pendingContactData.contactData.name }
            : undefined,
          image:
            loadPicture && pendingContactData.contactData.imageId
              ? await getPhotoDataFromPublic(odinId, pendingContactData.contactData.imageId)
              : undefined,

          source: 'pending',
        };
      }
    }
  } catch (ex) {
    return;
  }
};

export const fetchDataFromPublic = async (
  odinId: string,
  loadPicture: boolean
): Promise<RawContact | undefined> => {
  const client = new DotYouClient({ api: ApiType.YouAuth, identity: odinId });
  const rawData = await GetFile(client, 'public.json');

  const nameAttr = rawData?.get('name')?.[0];
  const photoRefAttr = rawData?.get('photo')?.[0];
  const photoFile = rawData?.get(photoRefAttr?.payload?.data?.profileImageId)?.[0] ?? undefined;

  if (!photoFile || !loadPicture) {
    return {
      name:
        nameAttr?.payload?.data.givenName || nameAttr?.payload?.data.surname
          ? {
              displayName: nameAttr.payload.data[MinimalProfileFields.DisplayName],
              givenName: nameAttr.payload.data[MinimalProfileFields.GivenNameId],
              surname: nameAttr.payload.data[MinimalProfileFields.SurnameId],
            }
          : undefined,
      image: undefined,
      source: 'public',
    };
  }

  const previewThumbnail = photoFile.additionalThumbnails?.reduce(
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
  const client = new DotYouClient({ api: ApiType.YouAuth, identity: odinId });
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
