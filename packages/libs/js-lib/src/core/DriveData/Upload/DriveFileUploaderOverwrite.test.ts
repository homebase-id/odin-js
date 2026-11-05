import { beforeEach, expect, test, vi } from 'vitest';
import { ApiType, DotYouClient } from '../../DotYouClient';
import { encryptKeyHeader } from '../SecurityHelpers';
import { getRandom16ByteArray } from '../../../helpers/DataUtil';
import { uploadFile } from './DriveFileUploader';
import { pureUpdateV2, pureUploadV2 } from './UploadHelpers';
import { getFileHeader } from '../File/DriveFileProvider';
import { deleteFile } from '../File/DriveFileManager';
import { UploadFileMetadata, UploadInstructionSet } from './DriveUploadTypes';
import { HomebaseFile, SecurityGroupType } from '../File/DriveFileTypes';

vi.mock('./UploadHelpers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./UploadHelpers')>()),
  pureUploadV2: vi.fn(),
  pureUpdateV2: vi.fn(),
}));
vi.mock('../File/DriveFileProvider', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../File/DriveFileProvider')>()),
  getFileHeader: vi.fn(),
}));
vi.mock('../File/DriveFileManager', () => ({ deleteFile: vi.fn().mockResolvedValue(true) }));

const drive = {
  alias: 'e8475dc46cb4b6651c2d0dbd0f3aad5f',
  type: '8f448716e34cedf9014145e043ca6612',
};
const fileId = '5a3503d3-c99e-4392-bcf0-8dc0c71919e2';
const dotYouClient = new DotYouClient({
  api: ApiType.App,
  hostIdentity: 'frodo.dotyou.cloud',
  sharedSecret: new Uint8Array(16).fill(1),
});
const instructions: UploadInstructionSet = {
  transferIv: getRandom16ByteArray(),
  storageOptions: { drive, overwriteFileId: fileId },
};
const metadata = (versionTag?: string): UploadFileMetadata => ({
  versionTag,
  allowDistribution: false,
  isEncrypted: false,
  accessControlList: { requiredSecurityGroup: SecurityGroupType.Owner },
  appData: { fileType: 1, content: 'content' },
});
const payload = (key: string) => ({ key, payload: new Blob(['bytes'], { type: 'text/plain' }) });

const existingFile = async (isEncrypted: boolean) =>
  ({
    fileId,
    sharedSecretEncryptedKeyHeader: isEncrypted
      ? await encryptKeyHeader(
          dotYouClient,
          { aesKey: new Uint8Array(16).fill(2), iv: getRandom16ByteArray() },
          getRandom16ByteArray()
        )
      : undefined,
    fileMetadata: {
      isEncrypted,
      versionTag: 'server-tag',
      payloads: [{ key: 'keep_key' }, { key: 'drop_key' }],
    },
  }) as unknown as HomebaseFile;

const updateResult = { file: { fileId, targetDrive: drive }, newVersionTag: 'new-tag' };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(pureUpdateV2).mockResolvedValue(updateResult as never);
  vi.mocked(pureUploadV2).mockResolvedValue({
    file: { fileId: 'new-id', targetDrive: drive },
  } as never);
});

const sentInstructions = async (data: FormData) =>
  JSON.parse(await (data.get('instructions') as File).text());
const lastUpdateData = () => vi.mocked(pureUpdateV2).mock.calls[0][2] as unknown as FormData;

test('an overwrite goes to PATCH and deletes the payloads not sent again', async () => {
  vi.mocked(getFileHeader).mockResolvedValue(await existingFile(false));

  const result = await uploadFile(
    dotYouClient,
    instructions,
    metadata('my-tag'),
    [payload('keep_key')],
    undefined,
    false
  );

  expect(pureUploadV2).not.toHaveBeenCalled();
  expect(deleteFile).not.toHaveBeenCalled();
  expect(vi.mocked(pureUpdateV2).mock.calls[0][1]).toEqual({ fileId, targetDrive: drive });
  expect(result?.file.fileId).toBe(fileId);

  const operations = (await sentInstructions(lastUpdateData())).manifest.PayloadDescriptors;
  expect(operations.map((op: { payloadKey: string }) => op.payloadKey).sort()).toEqual([
    'drop_key',
    'keep_key',
  ]);
});

test('an overwrite with no version tag uses the one on the server', async () => {
  vi.mocked(getFileHeader).mockResolvedValue(await existingFile(false));

  await uploadFile(dotYouClient, instructions, metadata(), [], undefined, false);

  expect((await sentInstructions(lastUpdateData())).versionTag).toBe('server-tag');
});

test('an encrypted overwrite keeps the key of the file and returns it', async () => {
  vi.mocked(getFileHeader).mockResolvedValue(await existingFile(true));

  const result = await uploadFile(
    dotYouClient,
    instructions,
    metadata('my-tag'),
    undefined,
    undefined,
    true
  );

  expect(pureUpdateV2).toHaveBeenCalled();
  expect(result?.keyHeader?.aesKey).toEqual(new Uint8Array(16).fill(2));
});

test('switching encryption deletes the file and creates it again', async () => {
  vi.mocked(getFileHeader).mockResolvedValue(await existingFile(true));

  const result = await uploadFile(
    dotYouClient,
    instructions,
    metadata('server-tag'),
    undefined,
    undefined,
    false
  );

  expect(deleteFile).toHaveBeenCalledWith(
    dotYouClient,
    drive,
    fileId,
    undefined,
    undefined,
    undefined,
    true
  );
  expect(pureUpdateV2).not.toHaveBeenCalled();
  expect(pureUploadV2).toHaveBeenCalledOnce();
  expect(result?.file.fileId).toBe('new-id');
});

test('switching encryption from a stale version does not delete the file', async () => {
  vi.mocked(getFileHeader).mockResolvedValue(await existingFile(true));
  const onVersionConflict = vi.fn();

  await uploadFile(
    dotYouClient,
    instructions,
    metadata('stale-tag'),
    undefined,
    undefined,
    false,
    onVersionConflict
  );

  expect(onVersionConflict).toHaveBeenCalledOnce();
  expect(deleteFile).not.toHaveBeenCalled();
  expect(pureUploadV2).not.toHaveBeenCalled();
});

test('an overwrite refuses a caller-supplied aesKey', async () => {
  await expect(
    uploadFile(dotYouClient, instructions, metadata(), [], undefined, true, undefined, {
      aesKey: new Uint8Array(16).fill(3),
    })
  ).rejects.toThrow('aesKey');
  expect(getFileHeader).not.toHaveBeenCalled();
});

test('a new file still goes to the V2 create route', async () => {
  await uploadFile(
    dotYouClient,
    { ...instructions, storageOptions: { drive } },
    metadata(),
    [],
    undefined,
    false
  );

  expect(getFileHeader).not.toHaveBeenCalled();
  expect(pureUploadV2).toHaveBeenCalledOnce();
});
