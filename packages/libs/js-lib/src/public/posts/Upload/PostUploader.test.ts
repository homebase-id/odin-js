import { test, expect, vi, describe } from 'vitest';
import { savePost } from './PostUploader';
import { ApiType, DotYouClient } from '../../../core/DotYouClient';
import { BlogConfig, Tweet } from '../PostTypes';
import { encryptKeyHeader } from '../../../core/DriveData/SecurityHelpers';
import {
  HomebaseFile,
  NewHomebaseFile,
  NewMediaFile,
  SecurityGroupType,
} from '../../../core/DriveData/File/DriveFileTypes';

// Mock axios module
const mockAxios = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  create: vi.fn().mockReturnThis(),
  interceptors: {
    request: {
      use: vi.fn(),
      eject: vi.fn(),
    },
    response: {
      use: vi.fn(),
      eject: vi.fn(),
    },
  },
  defaults: {
    baseUrl: '',
  },
}));

vi.mock('axios', () => ({
  default: mockAxios,
}));

const dotYouClient = new DotYouClient({
  api: ApiType.Guest,
  hostIdentity: 'example.com',
  sharedSecret: new Uint8Array(16).fill(1),
});

const newPostFile: NewHomebaseFile<Tweet> = {
  fileMetadata: {
    appData: {
      content: {
        id: '',
        channelId: '',
        authorOdinId: '',
        caption: '',
        slug: '',
        type: 'Tweet',
      },
    },
  },
  serverMetadata: {
    accessControlList: { requiredSecurityGroup: SecurityGroupType.Anonymous },
  },
};
const channelId = BlogConfig.PublicChannelId;

const existingPostFile: HomebaseFile<Tweet> = {
  fileMetadata: {
    globalTransitId: 'globalTransitId',
    appData: {
      content: {
        id: '',
        channelId: '',
        authorOdinId: '',
        caption: '',
        slug: '',
        type: 'Tweet',
      },
      fileType: 0,
      dataType: 0,
    },
    created: 0,
    updated: 0,
    isEncrypted: false,
    senderOdinId: '',
    originalAuthor: '',
    versionTag: 'oldVersionTag',
    payloads: [],
  },
  serverMetadata: {
    accessControlList: { requiredSecurityGroup: SecurityGroupType.Anonymous },
    allowDistribution: false,
    doNotIndex: false,
  },
  fileState: 'active',
  fileId: 'c18bfab0-2f02-42b7-a21b-bec77756a0a1',
  fileSystemType: 'Standard',
  sharedSecretEncryptedKeyHeader: await encryptKeyHeader(
    dotYouClient,
    { aesKey: new Uint8Array(16).fill(1), iv: new Uint8Array(16).fill(1) },
    new Uint8Array(16).fill(1)
  ),
};

describe('PostUploader for local files', () => {
  test('SavePost with a new post should upload a new file', async () => {
    vi.clearAllMocks();

    mockAxios.get.mockResolvedValueOnce({
      status: 404,
      data: null,
    });

    mockAxios.post.mockResolvedValueOnce({
      status: 200,
      data: {
        keyHeader: undefined,
        file: {
          fileId: 'fileId',
          versionTag: 'versionTag',
        },
        globalTransitIdFileIdentifier: 'globalTransitIdFileIdentifier',
        recipientStatus: {},
        newVersionTag: 'newVersionTag',
      },
    });

    await savePost(dotYouClient, newPostFile, undefined, channelId);
    expect(mockAxios.post.mock.calls.length).toBe(1);
    expect(mockAxios.post.mock.calls[0][0]).toBe('/drive/files/upload');
  });

  test('SavePost with an existing post should update a file header', async () => {
    vi.clearAllMocks();

    mockAxios.get
      .mockResolvedValueOnce({
        status: 200,
        data: existingPostFile,
      })
      .mockResolvedValueOnce({
        status: 200,
        data: existingPostFile,
      });

    mockAxios.patch.mockResolvedValueOnce({
      status: 200,
      data: {
        keyHeader: undefined,
        file: {
          fileId: 'fileId',
          versionTag: 'versionTag',
        },
        globalTransitIdFileIdentifier: 'globalTransitIdFileIdentifier',
        recipientStatus: {},
        newVersionTag: 'newVersionTag',
      },
    });

    await savePost(dotYouClient, existingPostFile, undefined, channelId);
    expect(mockAxios.patch.mock.calls.length).toBe(1);
    expect(mockAxios.patch.mock.calls[0][0]).toBe('/drive/files/update');
    const formDataBody = mockAxios.patch.mock.calls[0][1];
    const instructionsAsString = await (formDataBody.get('instructions') as Blob).text();
    const instructions = JSON.parse(instructionsAsString);
    expect(instructions.file.fileId).toBe(existingPostFile.fileId);
  });

  test('SavePost of an existing post with less payloads should delete the old payloads', async () => {
    vi.clearAllMocks();

    const existPostFileWithPayloads: HomebaseFile<Tweet> = {
      ...existingPostFile,
      fileMetadata: {
        ...existingPostFile.fileMetadata,
        payloads: [
          {
            key: 'old-pyld',
            descriptorContent: undefined,
            contentType: '',
            bytesWritten: 0,
            lastModified: 0,
            thumbnails: [],
            previewThumbnail: undefined,
            iv: undefined,
          },
        ],
      },
    };

    mockAxios.get
      .mockResolvedValueOnce({
        status: 200,
        data: existingPostFile,
      })
      .mockResolvedValueOnce({
        status: 200,
        data: existingPostFile,
      });

    mockAxios.patch.mockResolvedValueOnce({
      status: 200,
      data: {
        keyHeader: undefined,
        file: {
          fileId: 'fileId',
          versionTag: 'versionTag',
        },
        globalTransitIdFileIdentifier: 'globalTransitIdFileIdentifier',
        recipientStatus: {},
        newVersionTag: 'newVersionTag',
      },
    });

    await savePost(dotYouClient, existPostFileWithPayloads, undefined, channelId);
    expect(mockAxios.patch.mock.calls.length).toBe(1);
    expect(mockAxios.patch.mock.calls[0][0]).toBe('/drive/files/update');

    const formDataBody = mockAxios.patch.mock.calls[0][1];
    const instructionsAsString = await (formDataBody.get('instructions') as Blob).text();
    const instructions = JSON.parse(instructionsAsString);
    expect(instructions.file.fileId).toBe(existingPostFile.fileId);
  });

  test('SavePost of an existing post with more payloads should append the new payloads', async () => {
    vi.clearAllMocks();

    mockAxios.get
      .mockResolvedValueOnce({
        status: 200,
        data: existingPostFile,
      })
      .mockResolvedValueOnce({
        status: 200,
        data: existingPostFile,
      });

    mockAxios.patch.mockResolvedValueOnce({
      status: 200,
      data: {
        keyHeader: undefined,
        file: {
          fileId: 'fileId',
          versionTag: 'versionTag',
        },
        globalTransitIdFileIdentifier: 'globalTransitIdFileIdentifier',
        recipientStatus: {},
        newVersionTag: 'newVersionTag',
      },
    });

    const toSaveFiles: NewMediaFile[] = [
      {
        file: new Blob(),
      },
    ];

    await savePost(dotYouClient, existingPostFile, undefined, channelId, toSaveFiles);
    expect(mockAxios.patch.mock.calls.length).toBe(1);

    expect(mockAxios.patch.mock.calls[0][0]).toBe('/drive/files/update');
    const appendFormDataBody = mockAxios.patch.mock.calls[0][1];
    expect(appendFormDataBody.get('payload').name).toBe('pst_mdi0');

    const instructionsAsString = await (appendFormDataBody.get('instructions') as Blob).text();
    const instructions = JSON.parse(instructionsAsString);
    expect(instructions.file.fileId).toBe(existingPostFile.fileId);
  });

  test('SavePost should throw an error if the file is missing info', async () => {
    vi.clearAllMocks();

    const newPostFileMissingInfo: NewHomebaseFile<Tweet> = {
      fileMetadata: {
        appData: {
          content: {
            id: '',
            channelId: '',
            authorOdinId: '',
            caption: '',
            slug: '',
            type: 'Tweet',
          },
        },
      },
    } as NewHomebaseFile<Tweet>;

    await expect(
      savePost(dotYouClient, newPostFileMissingInfo, undefined, channelId)
    ).rejects.toThrow();
  });

  test('SavePost should throw an error if the file is not found', async () => {
    vi.clearAllMocks();

    mockAxios.get.mockRejectedValueOnce({
      response: {
        status: 404,
        data: null,
      },
    });
    await expect(savePost(dotYouClient, existingPostFile, undefined, channelId)).rejects.toThrow(
      '[odin-js] PostUploader: Cannot update a post that does not exist'
    );
  });

  test('SavePost should throw an error if the channelId is incorrect', async () => {
    vi.clearAllMocks();

    await expect(
      savePost(dotYouClient, existingPostFile, undefined, 'some channel id')
    ).rejects.toThrow('GetTargetDriveFromChannelId: Invalid channelId: "some channel id"');
  });
});

describe('PostUploader for remote files', () => {
  test('SavePost with a new post should upload a new file', async () => {
    vi.clearAllMocks();

    vi.mock('../../../peer/peerData/ExternalPostsDataProvider', async () => {
      return {
        getPostBySlugOverPeer: () => null,
      };
    });

    mockAxios.post.mockResolvedValueOnce({
      status: 200,
      data: {
        remoteGlobalTransitIdFileIdentifier: {
          globalTransitId: 'fileId',
          targetDrive: {
            alias: '',
            type: '',
          },
        },
        recipientStatus: {
          'collaborative.com': 'Enqueued',
        },
      },
    });

    await savePost(dotYouClient, newPostFile, 'collaborative.com', channelId);
    // expect(mockAxios.post.mock.calls.length).toBe(1);
    // expect(mockAxios.post.mock.calls[0][0]).toBe('/transit/sender/files/send');
  });

  test('SavePost with an existing post should update a file header', async () => {
    vi.clearAllMocks();

    vi.mock('../../../peer/peerData/ExternalPostsDataProvider', async () => {
      return {
        getPostBySlugOverPeer: () => null,
      };
    });

    mockAxios.get.mockResolvedValueOnce({
      status: 200,
      data: existingPostFile,
    });

    mockAxios.patch.mockResolvedValueOnce({
      status: 200,
      data: {
        recipientStatus: {},
        newVersionTag: 'newVersionTag',
      },
    });

    await savePost(dotYouClient, existingPostFile, 'collaborative.com', channelId);
    expect(mockAxios.patch.mock.calls.length).toBe(1);
    expect(mockAxios.patch.mock.calls[0][0]).toBe('/drive/files/update');
    const formDataBody = mockAxios.patch.mock.calls[0][1];
    const instructionsAsString = await (formDataBody.get('instructions') as Blob).text();
    const instructions = JSON.parse(instructionsAsString);
    expect(instructions.recipients).toEqual(['collaborative.com']);
    expect(instructions.file.globalTransitId).toBe(existingPostFile.fileMetadata.globalTransitId);
  });

  test('SavePost should throw an error if the global transit id is not set when saving over peer', async () => {
    vi.clearAllMocks();

    await expect(
      savePost(
        dotYouClient,
        {
          ...existingPostFile,
          fileMetadata: { ...existingPostFile.fileMetadata, globalTransitId: undefined },
        },
        'example.org',
        channelId
      )
    ).rejects.toThrow(`[odin-js]: assertIfDefined GlobalTransitId undefined`);
  });
});
