import { test, expect, vi, describe } from 'vitest';
import { savePost } from './PostUploadProvider';
import { ApiType, DotYouClient } from '../../core/DotYouClient';
import { HomebaseFile, NewHomebaseFile, SecurityGroupType } from '../../core/core';
import { BlogConfig, Tweet } from './PostTypes';
import { encryptKeyHeader } from '../../core/DriveData/SecurityHelpers';

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

vi.mock('axios', () => {
  return {
    default: mockAxios,
  };
});

const dotYouClient = new DotYouClient({
  api: ApiType.Guest,
  identity: 'example.com',
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
    versionTag: '',
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
  priority: 0,
};

describe('PostUploadProvider for local files', () => {
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

    await savePost(dotYouClient, existingPostFile, undefined, channelId);
    expect(mockAxios.post.mock.calls.length).toBe(1);
    expect(mockAxios.post.mock.calls[0][0]).toBe('/drive/files/upload');
    const formDataBody = mockAxios.post.mock.calls[0][1];
    const instructionsAsString = await (formDataBody.get('instructions') as Blob).text();
    const instructions = JSON.parse(instructionsAsString);
    expect(instructions.storageOptions.overwriteFileId).toBe(existingPostFile.fileId);
  });
});

describe('PostUploadProvider for remote files', () => {
  test('SavePost with a new post should upload a new file', async () => {
    vi.clearAllMocks();

    // Get over peer
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
        recipientStatus: {},
      },
    });

    await savePost(dotYouClient, newPostFile, 'collaborative.com', channelId);
    expect(mockAxios.post.mock.calls.length).toBe(1);
    expect(mockAxios.post.mock.calls[0][0]).toBe('/transit/sender/files/send');
  });

  test('SavePost with an existing post should update a file header', async () => {
    vi.clearAllMocks();

    vi.mock('../../peer/peerData/ExternalPostsDataProvider', async () => {
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
});
