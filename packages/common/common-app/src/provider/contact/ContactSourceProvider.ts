import {
  BuiltInAttributes,
  MinimalProfileFields,
  LocationFields,
  PhoneFields,
  BirthdayFields,
  GetTargetDriveFromProfileId,
  BuiltInProfiles,
  EmailFields,
} from '@homebase-id/js-lib/profile';

import { OdinClient, ImageContentType } from '@homebase-id/js-lib/core';
import {
  getProfileAttributesOverPeer,
  getDecryptedImageDataOverPeer,
} from '@homebase-id/js-lib/peer';
import { uint8ArrayToBase64 } from '@homebase-id/js-lib/helpers';
import { GetProfileCard, GetProfileImage } from '@homebase-id/js-lib/public';
import { RawContact, getConnectionInfo } from '@homebase-id/js-lib/network';

//Handles fetching and parsing of Contact Source data

export const fetchConnectionInfo = async (
  odinClient: OdinClient,
  odinId: string
): Promise<RawContact | undefined> => {
  const [connectionContactData, contactFromTransit] = await Promise.all([
    getConnectionInfo(odinClient, odinId),
    queryRemoteAttributes(odinClient, odinId),
  ]);

  return {
    odinId,
    name: contactFromTransit?.name,
    image: contactFromTransit?.image,
    ...contactFromTransit,
    source: connectionContactData?.status === 'connected' ? 'contact' : 'public',
  };
};

const queryRemoteAttributes = async (
  odinClient: OdinClient,
  odinId: string
): Promise<RawContact | undefined> => {
  try {
    const [name, phone, email, location, birthday, photo] = await Promise.all([
      (await getProfileAttributesOverPeer(odinClient, odinId, BuiltInAttributes.Name))?.[0],
      (
        await getProfileAttributesOverPeer(odinClient, odinId, BuiltInAttributes.PhoneNumber)
      )?.[0],
      (await getProfileAttributesOverPeer(odinClient, odinId, BuiltInAttributes.Email))?.[0],
      (await getProfileAttributesOverPeer(odinClient, odinId, BuiltInAttributes.Address))?.[0],
      (await getProfileAttributesOverPeer(odinClient, odinId, BuiltInAttributes.Birthday))?.[0],
      (await getProfileAttributesOverPeer(odinClient, odinId, BuiltInAttributes.Photo))?.[0],
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
          odinClient,
          odinId,
          photo.fileId as string,
          photoAttr.data?.[MinimalProfileFields.ProfileImageKey]
        )) || undefined
        : undefined,
    };
  } catch (ex) {
    console.warn('Error fetching remote attributes', ex);
    return undefined;
  }
};

const queryConnectionPhotoData = async (
  odinClient: OdinClient,
  odinId: string,
  profileImageFileId: string,
  profileImageKey: string
) => {
  const imageData = await getDecryptedImageDataOverPeer(
    odinClient,
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
  const profileCard = await GetProfileCard(odinId);
  const imageData = await GetProfileImage(odinId);

  return {
    name: profileCard?.name
      ? {
        displayName: profileCard?.name,
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
