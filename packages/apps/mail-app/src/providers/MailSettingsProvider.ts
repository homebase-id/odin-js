import {
  DotYouClient,
  HomebaseFile,
  NewHomebaseFile,
  RichText,
  SecurityGroupType,
  UploadFileMetadata,
  UploadInstructionSet,
  UploadResult,
  getFileHeaderByUniqueId,
  uploadFile,
} from '@homebase-id/js-lib/core';
import { MailDrive } from './MailProvider';
import { jsonStringify64, stringGuidsEqual, toGuidId } from '@homebase-id/js-lib/helpers';

export const MAIL_SETTINGS_FILE_TYPE = 9050;

export interface MailSettings {
  mailFooter?: RichText;
}

export const mailSettingsUniqueId = toGuidId('mail-settings');
export const fetchMailSettings = async (
  dotYouClient: DotYouClient
): Promise<HomebaseFile<MailSettings> | null> => {
  const fileHeader = await getFileHeaderByUniqueId<MailSettings>(
    dotYouClient,
    MailDrive,
    mailSettingsUniqueId
  );

  if (!fileHeader) {
    return null;
  }

  return fileHeader;
};

export const uploadMailSettings = async (
  dotYouClient: DotYouClient,
  settings: HomebaseFile<MailSettings> | NewHomebaseFile<MailSettings>
): Promise<UploadResult> => {
  if (!stringGuidsEqual(settings.fileMetadata.appData.uniqueId, mailSettingsUniqueId)) {
    throw new Error('Invalid settings unique id');
  }

  const uploadInstructions: UploadInstructionSet = {
    storageOptions: {
      drive: MailDrive,
    },
  };

  const jsonContent: string = jsonStringify64({ ...settings.fileMetadata.appData.content });
  const uploadMetadata: UploadFileMetadata = {
    versionTag: settings?.fileMetadata.versionTag,
    allowDistribution: false,
    appData: {
      uniqueId: settings.fileMetadata.appData.uniqueId,
      groupId: settings.fileMetadata.appData.groupId,
      userDate: settings.fileMetadata.appData.userDate,
      fileType: MAIL_SETTINGS_FILE_TYPE,
      content: jsonContent,
    },
    isEncrypted: true,
    accessControlList: {
      requiredSecurityGroup: SecurityGroupType.Owner,
    },
  };

  const uploadResult = await uploadFile(dotYouClient, uploadInstructions, uploadMetadata);
  if (!uploadResult) {
    throw new Error('Failed to save mail settings');
  }

  return uploadResult;
};
