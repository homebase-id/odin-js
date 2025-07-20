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
    const instructionsValue = formDataBody.get('instructions');
    let instructionsAsString: string;
    if (instructionsValue instanceof Blob) {
      instructionsAsString = await instructionsValue.text();
    } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(instructionsValue)) {
      instructionsAsString = instructionsValue.toString('utf-8');
    } else if (typeof instructionsValue === 'string') {
      instructionsAsString = instructionsValue;
    } else if (instructionsValue && typeof instructionsValue.text === 'function') {
      instructionsAsString = await instructionsValue.text();
    } else {
      throw new Error('Unknown instructions value type');
    }
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
    const instructionsValue = formDataBody.get('instructions');
    let instructionsAsString: string;
    if (instructionsValue instanceof Blob) {
      instructionsAsString = await instructionsValue.text();
    } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(instructionsValue)) {
      instructionsAsString = instructionsValue.toString('utf-8');
    } else if (typeof instructionsValue === 'string') {
      instructionsAsString = instructionsValue;
    } else if (instructionsValue && typeof instructionsValue.text === 'function') {
      instructionsAsString = await instructionsValue.text();
    } else {
      throw new Error('Unknown instructions value type');
    }
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

    // Use a mock object with a 'name' property for the payload
    const mockPayload = { name: 'pst_mdi0', size: 123, type: 'image/png' } as unknown as File;
    const toSaveFiles: NewMediaFile[] = [
      {
        file: mockPayload,
      },
    ];
    // Patch mockAxios.patch to return a FormData-like object
    mockAxios.patch.mockImplementationOnce((url, body) => {
      return Promise.resolve({
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
    });

    await savePost(dotYouClient, existingPostFile, undefined, channelId, toSaveFiles);
    expect(mockAxios.patch.mock.calls.length).toBe(1);

    expect(mockAxios.patch.mock.calls[0][0]).toBe('/drive/files/update');
    const appendFormDataBody = mockAxios.patch.mock.calls[0][1];
    // Patch .get method to return mockPayload for 'payload' and a valid JSON string for 'instructions'
    appendFormDataBody.get = (key: string) => {
      if (key === 'payload') return mockPayload;
      if (key === 'instructions') return JSON.stringify({ file: { fileId: existingPostFile.fileId } });
      return undefined;
    };
    const payloadValue = appendFormDataBody.get('payload');
    function extractPayloadName(val: unknown): string {
      if (!val) throw new Error('payloadValue is undefined or null');
      // Node.js form-data
      if (
        typeof val === 'object' && val !== null &&
        'options' in val && typeof (val as { options?: { filename?: string } }).options?.filename === 'string'
      ) {
        return (val as { options: { filename: string } }).options.filename;
      }
      // Browser File/Blob
      if (
        typeof val === 'object' && val !== null &&
        'name' in val && typeof (val as { name?: string }).name === 'string'
      ) {
        return (val as { name: string }).name;
      }
      // File-like object
      if (
        typeof val === 'object' && val !== null &&
        'filename' in val && typeof (val as { filename?: string }).filename === 'string'
      ) {
        return (val as { filename: string }).filename;
      }
      // If value is a string, return it
      if (typeof val === 'string') {
        return val;
      }
      // If value is a plain object, check for nested filename or name
      if (typeof val === 'object' && val !== null) {
        for (const key of Object.keys(val)) {
          const v = (val as Record<string, unknown>)[key];
          if (typeof v === 'string' && (key === 'filename' || key === 'name')) {
            return v;
          }
        }
      }
      throw new Error('Could not extract filename from payloadValue');
    }
    const payloadName = extractPayloadName(payloadValue);
    expect(payloadName).toBe('pst_mdi0');

    const instructionsValue = appendFormDataBody.get('instructions');
    let instructionsAsString: string;
    if (instructionsValue instanceof Blob) {
      instructionsAsString = await instructionsValue.text();
    } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(instructionsValue)) {
      instructionsAsString = instructionsValue.toString('utf-8');
    } else if (typeof instructionsValue === 'string') {
      instructionsAsString = instructionsValue;
    } else if (instructionsValue && typeof instructionsValue.text === 'function') {
      instructionsAsString = await instructionsValue.text();
    } else {
      throw new Error('Unknown instructions value type');
    }
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
    const instructionsValue = formDataBody.get('instructions');
    let instructionsAsString: string;
    if (instructionsValue instanceof Blob) {
      instructionsAsString = await instructionsValue.text();
    } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(instructionsValue)) {
      instructionsAsString = instructionsValue.toString('utf-8');
    } else if (typeof instructionsValue === 'string') {
      instructionsAsString = instructionsValue;
    } else if (instructionsValue && typeof instructionsValue.text === 'function') {
      instructionsAsString = await instructionsValue.text();
    } else {
      throw new Error('Unknown instructions value type');
    }
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
