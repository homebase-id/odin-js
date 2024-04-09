import { ActionButton, useDotYouClient } from '@youfoundation/common-app';
import { PageMeta } from '../../components/ui/PageMeta/PageMeta';
import { hasDebugFlag, toGuidId } from '@youfoundation/js-lib/helpers';
import {
  HomebaseFile,
  KeyHeader,
  NewHomebaseFile,
  SecurityGroupType,
  UploadFileMetadata,
  UploadInstructionSet,
  getFileHeaderByUniqueId,
  uploadFile,
  uploadHeader,
} from '@youfoundation/js-lib/core';
import { BuiltInProfiles, GetTargetDriveFromProfileId } from '@youfoundation/js-lib/profile';
import { useEffect, useState } from 'react';

const SixDebug = () => {
  const [keyHeader, setKeyHeader] = useState<KeyHeader | undefined>(undefined);
  const [dummyFile, setDummyFile] = useState<NewHomebaseFile<string> | HomebaseFile<string>>({
    fileMetadata: {
      appData: {
        uniqueId: toGuidId('dummy_file'),
        content: 'DUMMY_FILE',
      },
    },
    serverMetadata: {
      accessControlList: { requiredSecurityGroup: SecurityGroupType.Owner },
    },
  });

  const dotYouClient = useDotYouClient().getDotYouClient();

  const targetDrive = GetTargetDriveFromProfileId(BuiltInProfiles.WalletId);

  const doSaveFile = async (file: NewHomebaseFile<string> | HomebaseFile<string>) => {
    const instructionSet: UploadInstructionSet = {
      storageOptions: {
        overwriteFileId: file.fileId,
        drive: targetDrive,
      },
    };

    const metadata: UploadFileMetadata = {
      versionTag: file.fileMetadata.versionTag,
      allowDistribution: false,
      appData: {
        uniqueId: file.fileMetadata.appData.uniqueId,
        content: file.fileMetadata.appData.content,
      },
      isEncrypted: true,
      accessControlList: { requiredSecurityGroup: SecurityGroupType.Owner },
    };

    //reshape the definition to group attributes by their type
    if (file.fileId) {
      await uploadHeader(dotYouClient, keyHeader, instructionSet, metadata, undefined, undefined);
    } else {
      const uploadResult = await uploadFile(
        dotYouClient,
        instructionSet,
        metadata,
        undefined,
        undefined,
        true
      );
      if (!uploadResult) return;

      setDummyFile({
        ...file,
        fileId: uploadResult.file.fileId,
        fileMetadata: {
          ...file.fileMetadata,
          versionTag: uploadResult.newVersionTag,
        },
      });
      setKeyHeader(uploadResult.keyHeader);
    }
  };

  const doForceUpdateFile = () => {
    if (!dummyFile.fileId) return;
    Promise.all(
      [1, 2, 3, 4, 5, 6].map(async () => {
        await doSaveFile(dummyFile);
      })
    );
  };

  useEffect(() => {
    if (dummyFile.fileId) return;
    (async () => {
      const existingFile = await getFileHeaderByUniqueId<string>(
        dotYouClient,
        targetDrive,
        toGuidId('dummy_file'),
        { decrypt: false }
      );
      if (existingFile) {
        setDummyFile({
          ...dummyFile,
          fileId: existingFile.fileId,
          fileMetadata: {
            ...dummyFile.fileMetadata,
            versionTag: existingFile.fileMetadata.versionTag,
          },
        });
      }
    })();
  }, []);

  const isDebug = hasDebugFlag();
  if (!isDebug) return null;

  return (
    <>
      <div className="flex min-h-full flex-col">
        <PageMeta title="6x Debug" />
        <div className="flex flex-row gap-5">
          <ActionButton onClick={() => doSaveFile(dummyFile)}>Save file</ActionButton>
          {dummyFile.fileId ? (
            <ActionButton onClick={() => doForceUpdateFile()}>Update file (6x)</ActionButton>
          ) : null}
        </div>
      </div>
    </>
  );
};

export default SixDebug;
