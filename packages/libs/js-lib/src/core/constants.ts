export const DEFAULT_PAYLOAD_KEY = 'dflt_key';
export const DEFAULT_PAYLOAD_DESCRIPTOR_KEY = 'pld_desc';
export const MAX_PAYLOAD_DESCRIPTOR_BYTES = 1024; // 1kb
export const MAX_HEADER_CONTENT_BYTES = 7000; // 10240 bytes is the server limit for the total Local App Content; But we need to account for encryption;

//
// App ids, mirroring SystemAppConstants in odin-core. Change one, change both.
//
// These identify the app that OWNS a drive, and `ensureDrive` requires one: every drive is owned by
// an app, and the server derives a drive slug against the set that app already holds.
//
export const CHAT_APP_ID = '2d781401-3804-4b57-b4aa-d8e4e2ef39f4';
export const FEED_APP_ID = '5f887d80-0132-4294-ba40-bda79155551d';
export const MAIL_APP_ID = '6e8ecfff-7c15-40e4-94f4-d6e83bfb5857';
export const PHOTO_APP_ID = '32f0bdbf-017f-4fc0-8004-2d4631182d1e';
export const CONTACTS_APP_ID = 'a1a7bd26-7f52-461f-98cf-1f0ec969d97a';
// Matches SystemAppConstants.CommunityAppId and common-app's COMMUNITY_APP_ID, which is the id the
// community client actually registers with. This constant held a different guid that nothing else
// used, so drives created through it were stamped with an app that does not exist.
export const COMMUNITY_APP_ID = '77ed6136-6b33-4654-8088-3d89c91e6065';

//
// Readable forms of a drive type, mirroring the DriveTypeSlug values in odin-core's BuiltinDrives.
//
export const CHANNEL_DRIVE_TYPE_SLUG = 'channel';
export const PROFILE_DRIVE_TYPE_SLUG = 'profile';
export const COMMUNITY_DRIVE_TYPE_SLUG = 'community';
