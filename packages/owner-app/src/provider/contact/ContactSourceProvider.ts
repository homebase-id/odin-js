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

import { ApiType, DotYouClient, ImageContentType } from '@youfoundation/js-lib/core';
import {
  getProfileAttributesOverPeer,
  getDecryptedImageDataOverPeer,
} from '@youfoundation/js-lib/transit';
import { uint8ArrayToBase64 } from '@youfoundation/js-lib/helpers';
import { GetFile, GetProfileImage } from '@youfoundation/js-lib/public';
import { RawContact, getDetailedConnectionInfo } from '@youfoundation/js-lib/network';

//Handles fetching and parsing of Contact Source data

export const fetchConnectionInfo = async (
  dotYouClient: DotYouClient,
  odinId: string
): Promise<RawContact | undefined> => {
  const [connectionContactData, contactFromTransit] = await Promise.all([
    getDetailedConnectionInfo(dotYouClient, odinId),
    queryRemoteAttributes(dotYouClient, odinId),
  ]);

  return {
    odinId,
    name: contactFromTransit?.name,
    image: contactFromTransit?.image,
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
      (await getProfileAttributesOverPeer(dotYouClient, odinId, BuiltInAttributes.Name))?.[0],
      (
        await getProfileAttributesOverPeer(dotYouClient, odinId, BuiltInAttributes.PhoneNumber)
      )?.[0],
      (await getProfileAttributesOverPeer(dotYouClient, odinId, BuiltInAttributes.Email))?.[0],
      (await getProfileAttributesOverPeer(dotYouClient, odinId, BuiltInAttributes.Address))?.[0],
      (await getProfileAttributesOverPeer(dotYouClient, odinId, BuiltInAttributes.Birthday))?.[0],
      (await getProfileAttributesOverPeer(dotYouClient, odinId, BuiltInAttributes.Photo))?.[0],
    ]);

    const nameAttr = name?.fileMetadata.appData.content;
    const phoneAttr = phone?.fileMetadata.appData.content;
    const emailAttr = email?.fileMetadata.appData.content;
    const birthdayAttr = birthday?.fileMetadata.appData.content;
    const locationAttr = location?.fileMetadata.appData.content;
    const photoAttr = photo?.fileMetadata.appData.content;

    return {
      source: 'public',
      odinId,
      name: {
        displayName: nameAttr?.data?.[MinimalProfileFields.DisplayName],
        additionalName: nameAttr?.data?.[MinimalProfileFields.AdditionalName],
        givenName: nameAttr?.data?.[MinimalProfileFields.GivenNameId],
        surname: nameAttr?.data?.[MinimalProfileFields.SurnameId],
      },
      location: {
        city: locationAttr?.data?.[LocationFields.City],
        country: locationAttr?.data?.[LocationFields.Country],
      },
      phone: { number: phoneAttr?.data?.[PhoneFields.PhoneNumber] },
      email: { email: emailAttr?.data?.[EmailFields.Email] },
      birthday: { date: birthdayAttr?.data?.[BirthdayFields.Date] },
      image: photo
        ? (await queryConnectionPhotoData(
            dotYouClient,
            odinId,
            photo.fileId as string,
            photoAttr.data[MinimalProfileFields.ProfileImageKey]
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
  profileImageFileId: string,
  profileImageKey: string
) => {
  const imageData = await getDecryptedImageDataOverPeer(
    dotYouClient,
    odinId,
    GetTargetDriveFromProfileId(BuiltInProfiles.StandardProfileId),
    profileImageFileId,
    profileImageKey
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
  const imageData = await GetProfileImage(client);

  return {
    name:
      nameAttr?.payload?.data.givenName || nameAttr?.payload?.data.surname
        ? {
            displayName: nameAttr?.payload.data[MinimalProfileFields.DisplayName],
            givenName: nameAttr?.payload.data[MinimalProfileFields.GivenNameId],
            surname: nameAttr?.payload.data[MinimalProfileFields.SurnameId],
          }
        : undefined,
    image: imageData
      ? {
          content: uint8ArrayToBase64(new Uint8Array(await imageData.arrayBuffer())),
          contentType: imageData.type as ImageContentType,
          pixelWidth: 250,
          pixelHeight: 250,
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
