// declare namespace NodeJS {
//   interface global {
//     OdinBlob: typeof Blob;
//   }
// }

declare namespace globalThis {
  const OdinBlob: typeof Blob;
}

// declare namespace NodeJS {
//   interface global extends globalThis {
//     OdinBlob: typeof Blob;
//   }
// }

// declare global {
//   interface Global {
//     OdinBlob: typeof Blob;
//   }
// }

declare const global: typeof globalThis;
