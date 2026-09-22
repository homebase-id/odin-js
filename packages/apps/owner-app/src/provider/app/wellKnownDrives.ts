import { TargetDrive } from '@homebase-id/js-lib/core';
import { drivesEqual } from '@homebase-id/js-lib/helpers';

/**
 * The drives with a fixed alias and type, each with the app that owns it.
 *
 * Mirrors odin-core `WellKnownAppDrives` + the `AppId` on each entry of `BuiltinDrives`, and the app
 * ids mirror `SystemAppConstants`. Change one, change both. DO NOT CHANGE ANY VALUE: these drives
 * already exist on identities, and an alias is a drive's storage id.
 *
 * This exists for one question only -- "may the app that just asked for this drive be recorded as
 * its owner?" -- so it lists the drives that belong to a *named* app. A drive that is not in here is
 * one the requesting app is inventing, and it owns what it invents.
 */
const WELL_KNOWN_DRIVE_OWNERS: { drive: TargetDrive; appId: string }[] = [
  // --- Chat ---
  {
    drive: { alias: '9ff813aff2d61e2f9b9db189e72d1a11', type: '66ea8355ae4155c39b5a719166b510e3' },
    appId: '2d781401-3804-4b57-b4aa-d8e4e2ef39f4',
  },
  {
    drive: {
      alias: '3b9c5f2e-7a41-4d6b-9e0c-8f1a2b3c4d5e',
      type: 'a8c64b10-7434-494b-8b8c-a2284bd643c8',
    },
    appId: '2d781401-3804-4b57-b4aa-d8e4e2ef39f4',
  },

  // --- Contacts (owns the standard profile drive too) ---
  {
    drive: { alias: '2612429d1c3f037282b8d42fb2cc0499', type: '70e92f0f94d05f5c7dcd36466094f3a5' },
    appId: 'a1a7bd26-7f52-461f-98cf-1f0ec969d97a',
  },
  {
    drive: { alias: '8f12d8c4933813d378488d91ed23b64c', type: '597241530e3ef24b28b9a75ec3a5c45c' },
    appId: 'a1a7bd26-7f52-461f-98cf-1f0ec969d97a',
  },

  // --- Email ---
  {
    drive: {
      alias: '92bbcad8-3558-417b-9376-9976c086a674',
      type: '37e3480a-4cd7-4a41-a421-ed49866bf07e',
    },
    appId: '4027937f-8a90-4f60-a5c3-18b850398482',
  },

  // --- Feed ---
  {
    drive: { alias: '4db49422ebad02e99ab96e9c477d1e08', type: 'a3227ffba87608beeb24fee9b70d92a6' },
    appId: '5f887d80-0132-4294-ba40-bda79155551d',
  },
  {
    drive: {
      alias: 'e8475dc46cb4b6651c2d0dbd0f3aad5f',
      type: '8f448716-e34c-edf9-0141-45e043ca6612',
    },
    appId: '5f887d80-0132-4294-ba40-bda79155551d',
  },

  // --- HomePage ---
  {
    drive: { alias: 'ec83345af6a747d4404ef8b0f8844caa', type: '597241530e3ef24b28b9a75ec3a5c45c' },
    appId: '135b6399-2d05-42d3-b1b6-124c2de6bd3f',
  },

  // --- Lists ---
  {
    drive: { alias: 'a44e7a2651f44a26ad125d7627b35d0e', type: '4338d7d2f217486a8790a4982644c15f' },
    appId: '101c2134-c074-48b9-871b-944bb63548f7',
  },

  // --- Location ---
  {
    drive: {
      alias: '2e191a14-8640-4ebc-b0c8-aaac913f6fa8',
      type: '9dbc3bf5-ca24-4d7d-98ca-6933af0ad491',
    },
    appId: '177d78f6-4084-45f3-b6d1-1f4735936fac',
  },

  // --- Mail ---
  {
    drive: { alias: 'e69b5a48a663482fbfd846f3b0b143b0', type: '2dfecc40311e41e5a12455e925144202' },
    appId: '6e8ecfff-7c15-40e4-94f4-d6e83bfb5857',
  },

  // --- Moments ---
  {
    drive: {
      alias: 'a85f8562-6c74-4947-896b-619812cafccc',
      type: '4338d7d2-f217-486a-8790-a4982644c15f',
    },
    appId: 'c61f5410-93d4-48dd-984a-965f0498e95e',
  },

  // --- Recovery ---
  {
    drive: { alias: '46242d0d67604b2aa683f05cd48d4aef', type: '43138ae90206480b9ff493580ca147ee' },
    appId: 'bc2fbb10-7574-4792-8db6-23c9b725a1d8',
  },

  // --- Vault (owns the wallet drive too) ---
  {
    drive: { alias: 'a6f991e214b11c8c9796f664e1ec0cac', type: '597241530e3ef24b28b9a75ec3a5c45c' },
    appId: '6d38d41a-99f5-4f45-a591-9862d83e1fc8',
  },
  {
    drive: { alias: 'f47ac10b58cc4372a5670e02b2c3d479', type: '70e92f0f94d05f5c7dcd36466094f3a5' },
    appId: '6d38d41a-99f5-4f45-a591-9862d83e1fc8',
  },

  // --- Community ---
  {
    drive: { alias: '3e5de26f8fa343c1975ad0dd2aa8564c', type: '93a6e08d14d9479e8d99bae4e5348a16' },
    appId: '77ed6136-6b33-4654-8088-3d89c91e6065',
  },

  // --- Photos ---
  {
    drive: { alias: '6483b7b1f71bd43eb6896c86148668cc', type: '2af68fe72fb84896f39f97c59d60813a' },
    appId: '32f0bdbf-017f-4fc0-8004-2d4631182d1e',
  },

  // --- Webdrop ---
  {
    drive: {
      alias: '6d1711af-8b93-43ef-b798-b84d51f25828',
      type: 'edee430a-73d4-49ae-a9ae-2d3091957702',
    },
    appId: '17bbd664-eed2-44d9-a66c-ddd310762b32',
  },
];

/**
 * The app that owns this drive when it is one of the well-known ones, otherwise undefined.
 */
export const getWellKnownDriveOwningAppId = (drive: TargetDrive): string | undefined =>
  WELL_KNOWN_DRIVE_OWNERS.find((entry) => drivesEqual(entry.drive, drive))?.appId;
