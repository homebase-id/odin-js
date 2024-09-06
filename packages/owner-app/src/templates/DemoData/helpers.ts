export const getRandomNumber = (max: number) => {
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

export const attrHasData = (attr: unknown) => {
  if (!attr || typeof attr !== 'object' || !('data' in attr)) return false;

  const attrObject = attr as { data: object };

  return attrObject.data && Object.keys(attrObject.data).length !== 0;
};
