export const DEFAULT_PAYLOAD_KEY = 'dflt_key';
export const DEFAULT_PAYLOAD_DESCRIPTOR_KEY = 'pld_desc';
export const MAX_PAYLOAD_DESCRIPTOR_BYTES = 1024; // 1kb
export const MAX_HEADER_CONTENT_BYTES = 7000; // 10240 bytes is the server limit for the total Local App Content; But we need to account for encryption;

//
// App ids, mirroring SystemAppConstants in odin-core. Change one, change both.
//
// These identify the app that OWNS a drive. Pass one to `ensureDrive` whenever the owner is known:
// the server only derives a drive slug for a drive that has an owning app, so omitting it leaves the
// drive unaddressed.
//
export const CHAT_APP_ID = '2d781401-3804-4b57-b4aa-d8e4e2ef39f4';
export const FEED_APP_ID = '5f887d80-0132-4294-ba40-bda79155551d';
export const MAIL_APP_ID = '6e8ecfff-7c15-40e4-94f4-d6e83bfb5857';
export const PHOTO_APP_ID = '32f0bdbf-017f-4fc0-8004-2d4631182d1e';
export const CONTACTS_APP_ID = 'a1a7bd26-7f52-461f-98cf-1f0ec969d97a';
export const COMMUNITY_APP_ID = '7802a474-5235-4581-af81-dd1a96d81edf';

//
// Readable forms of a drive type, mirroring the DriveTypeSlug values in odin-core's BuiltinDrives.
//
export const CHANNEL_DRIVE_TYPE_SLUG = 'channel';
export const PROFILE_DRIVE_TYPE_SLUG = 'profile';
export const COMMUNITY_DRIVE_TYPE_SLUG = 'community';
