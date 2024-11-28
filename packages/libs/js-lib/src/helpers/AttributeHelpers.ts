import { HomebaseFile, NewHomebaseFile } from '../core/DriveData/File/DriveFileTypes';
import { Attribute } from '../profile/AttributeData/AttributeDataTypes';
import { LocationFields, MinimalProfileFields } from '../profile/ProfileData/ProfileConfig';
import { PostContent } from '../public/posts/PostTypes';
import { getNewId } from './DataUtil';

export const slugify = (text: string) => {
  return text
    .replaceAll(/[^a-z0-9 ]/gi, '')
    .trim()
    .split(' ')
    .join('-')
    .toLowerCase();
};

/// Makes a slug of a Post; When it's an article it's a readable slug, otherwise it's the content id or a new id
export const makeSlug = (post: HomebaseFile<PostContent> | NewHomebaseFile<PostContent>) => {
  if (
    post.fileMetadata.appData.content.type === 'Article' &&
    post.fileMetadata.appData.content.caption
  ) {
    return slugify(post.fileMetadata.appData.content.caption);
  }

  return post.fileMetadata.appData.content.id || getNewId();
};

export const generateDisplayLocation = (
  AddressLine1: string,
  AddressLine2: string,
  Postcode: string,
  City: string,
  Country: string
) => {
  const allLocation = [];

  if (AddressLine1) allLocation.push(`${AddressLine1},`);
  if (AddressLine2) allLocation.push(AddressLine2);
  if (Postcode) allLocation.push(Postcode);
  if (City) allLocation.push(`${City}${Country ? ',' : ''}`);
  if (Country) allLocation.push(Country);

  return allLocation.join(' ');
};

export const getDisplayLocationFromLocationAttribute = (attr: Attribute) => {
  if (!attr) return '';

  return attr.data?.[LocationFields.DisplayLocation]
    ? attr.data?.[LocationFields.DisplayLocation]
    : generateDisplayLocation(
        attr.data?.[LocationFields.AddressLine1],
        attr.data?.[LocationFields.AddressLine2],
        attr.data?.[LocationFields.Postcode],
        attr.data?.[LocationFields.City],
        attr.data?.[LocationFields.Country]
      );
};

export const generateDisplayName = (first: string, last: string) => {
  const allNames = [];
  if (first) allNames.push(first);
  if (last) allNames.push(last);

  if (allNames.length !== 0) {
    return allNames.join(' ');
  } else {
    return window.location.hostname;
  }
};

export const getDisplayNameOfNameAttribute = (attr: Attribute) => {
  if (!attr) return '';

  const trimmedExplicit = attr.data?.[MinimalProfileFields.ExplicitDisplayName]?.trim();

  return trimmedExplicit && trimmedExplicit?.length
    ? trimmedExplicit
    : generateDisplayName(
        attr.data?.[MinimalProfileFields.GivenNameId],
        attr.data?.[MinimalProfileFields.SurnameId]
      );
};

export const getInitialsOfNameAttribute = (attr: Attribute): string => {
  if (!attr) return '';

  return (
    (attr.data?.[MinimalProfileFields.GivenNameId]?.[0] ?? '') +
    (attr.data?.[MinimalProfileFields.SurnameId]?.[0] ?? '')
  );
};
