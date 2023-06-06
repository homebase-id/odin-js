import {
  AttributeFile,
  getNewId,
  LocationFields,
  MinimalProfileFields,
  PostContent,
  PostFile,
} from '@youfoundation/js-lib';

export const convertTextToSlug = (text: string) => {
  return text
    .replaceAll(/[^a-z0-9 ]/gi, '')
    .trim()
    .split(' ')
    .join('-')
    .toLowerCase();
};

export const stringify = (obj: unknown) => {
  return Object.keys(obj as any)
    .map((key) => key + '=' + (obj as any)[key])
    .join('&');
};

export const getVersion = () => {
  try {
    const numberedVersion = parseInt(import.meta.env.VITE_VERSION ?? '');
    if (isNaN(numberedVersion)) {
      return import.meta.env.VITE_VERSION;
    }

    const t = new Date(1970, 0, 1); // Epoch
    t.setSeconds(numberedVersion);
    return `${t.toLocaleDateString()} ${t.toLocaleTimeString()}`;
  } catch (ex) {
    console.error(ex);
    return import.meta.env.VITE_VERSION;
  }
};

/// Makes a slug of a Post; When it's an article it's a readable slug, otherwise it's the content id or a new id
export const makeSlug = (post: PostFile<PostContent>) => {
  if (post.content.type === 'Article' && post.content.caption) {
    return convertTextToSlug(post.content.caption);
  }

  return post.content.id || getNewId();
};

export const ellipsisAtMaxChar = (str: string, maxChar: number) => {
  if (!str || !maxChar) {
    return str;
  }

  if (str.length < maxChar) {
    return str;
  }

  return `${str.substring(0, maxChar)}...`;
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

export const getDisplayLocationFromLocationAttribute = (attr: AttributeFile) => {
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

export const getDisplayNameOfNameAttribute = (attr: AttributeFile) => {
  if (!attr) return '';

  const trimmedExplicit = attr.data?.[MinimalProfileFields.ExplicitDisplayName]?.trim();

  return trimmedExplicit && trimmedExplicit?.length
    ? trimmedExplicit
    : generateDisplayName(
        attr.data?.[MinimalProfileFields.GivenNameId],
        attr.data?.[MinimalProfileFields.SurnameId]
      );
};

export const getInitialsOfNameAttribute = (attr: AttributeFile) => {
  if (!attr) return '';

  return (
    (attr.data?.[MinimalProfileFields.GivenNameId]?.[0] ?? '') +
    (attr.data?.[MinimalProfileFields.SurnameId]?.[0] ?? '')
  );
};
