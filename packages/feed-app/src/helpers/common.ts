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
