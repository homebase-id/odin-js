import { InfiniteData } from '@tanstack/react-query';

export const getRandomNumber = (max) => {
  return Math.floor(Math.random() * max);
};

export const rando = (arr: string[]) => {
  return arr[Math.floor(Math.random() * arr.length)];
};

export const getRandomAbstract = () => {
  const sentences = [
    'Ut bibendum, neque ac lacinia aliquam, justo ipsum aliquam urna, id vestibulum augue mauris sit amet lacus.',
    'Proin ante sapien, interdum sit amet eros sit amet, eleifend pharetra metus.',
    'Sed elit mi, euismod eget neque at, suscipit aliquam nisi.',
    'Nunc diam arcu, tincidunt quis dignissim ac, volutpat non odio.',
  ];

  return rando(sentences);
};

export const getFunName = () => {
  const adjectives = [
    'adorable',
    'beautiful',
    'clean',
    'drab',
    'elegant',
    'fancy',
    'glamorous',
    'handsome',
    'long',
    'magnificent',
    'old-fashioned',
    'plain',
    'quaint',
    'sparkling',
    'ugliest',
    'unsightly',
    'angry',
    'bewildered',
    'clumsy',
    'defeated',
    'embarrassed',
    'fierce',
    'grumpy',
    'helpless',
    'itchy',
    'jealous',
    'lazy',
    'mysterious',
    'nervous',
    'obnoxious',
    'panicky',
    'repulsive',
    'scary',
    'thoughtless',
    'uptight',
    'worried',
  ];

  const nouns = [
    'women',
    'men',
    'children',
    'teeth',
    'feet',
    'people',
    'leaves',
    'mice',
    'geese',
    'halves',
    'knives',
    'wives',
    'lives',
    'elves',
    'loaves',
    'potatoes',
    'tomatoes',
    'cacti',
    'foci',
    'fungi',
    'nuclei',
    'syllabuses',
    'analyses',
    'diagnoses',
    'oases',
    'theses',
    'crises',
    'phenomena',
    'criteria',
    'data',
  ];

  return `${rando(adjectives)} ${rando(adjectives)} ${rando(nouns)}`;
};

export const base64ToArrayBuffer = (base64: string) => {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
};

export const arrayBufferToBase64 = (buffer: Iterable<number>) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

export const getAccessFromPermissionNumber = (
  value: number,
  permissionLevels: { name: string; value: number }[]
) => {
  return permissionLevels.reduce((prevValue, currValue) => {
    if (currValue.value > prevValue.value && currValue.value <= value) {
      return currValue;
    }

    return prevValue;
  }, permissionLevels[0]);
};

export const moveElementInArray = (arr: Array<unknown>, fromIndex: number, toIndex: number) => {
  const element = arr[fromIndex];
  arr.splice(fromIndex, 1);
  arr.splice(toIndex, 0, element);

  return arr;
};

export const pascalCase = (str: string) => {
  const [capital, ...lowercased] = str.toLowerCase();
  return capital.toUpperCase() + lowercased.join('');
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

export const attrHasData = (attr) => {
  return attr?.data && Object.keys(attr.data).length !== 0;
};

// Flattens all pages, sorts descending and slice on the max number expected
export const flattenInfinteData = <T>(
  rawData:
    | InfiniteData<{
        results: T[];
        cursorState: unknown;
      }>
    | undefined,
  pageSize: number,
  sortFn: (a: T, b: T) => number
) => {
  return rawData?.pages
    .flatMap((page) => page?.results)
    .filter((post) => !!post)
    .sort(sortFn)
    .slice(0, rawData?.pages.length * pageSize) as T[];
};
