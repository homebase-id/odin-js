import axios from 'axios';
import { BaseDotYouClient } from '../../core/DotYouClient';
import { decryptData } from '../../core/InterceptionEncryptionUtil';

/** `https://{identity}/api/v2`. `getEndpoint()` only knows the V1 roots. */
export const getV2Root = (dotYouClient: BaseDotYouClient) => `${dotYouClient.getRoot()}/api/v2`;

/**
 * An axios client with the caller's shared-secret encryption, pointed at `/api/v2`.
 *
 * The encryption interceptors work on whatever URL the request has (encryptUrl only rewrites the
 * query string), so re-rooting the base URL is all a V2 call needs.
 */
export const createV2AxiosClient = (dotYouClient: BaseDotYouClient) => {
  const client = dotYouClient.createAxiosClient();
  client.defaults.baseURL = getV2Root(dotYouClient);
  return client;
};

/**
 * A V2 request that failed, with the server's message. Odin error bodies are ProblemDetails:
 * `title` carries the message and `errorCode` the machine-readable code. On shared-secret
 * encrypted routes the body is encrypted too, so it is decrypted here when possible.
 */
export class OdinV2ApiError extends Error {
  status?: number;
  errorCode?: string;
  data?: unknown;

  constructor(message: string, status?: number, errorCode?: string, data?: unknown) {
    super(message);
    this.name = 'OdinV2ApiError';
    this.status = status;
    this.errorCode = errorCode;
    this.data = data;
  }
}

export const toOdinV2ApiError = async (
  error: unknown,
  sharedSecret?: Uint8Array
): Promise<OdinV2ApiError | unknown> => {
  if (!axios.isAxiosError(error)) return error;

  const status = error.response?.status;
  let data: unknown = error.response?.data;

  if (
    sharedSecret &&
    data &&
    typeof data === 'object' &&
    'data' in data &&
    'iv' in data &&
    typeof data.data === 'string' &&
    typeof data.iv === 'string'
  ) {
    data = (await decryptData(data.data, data.iv, sharedSecret)) ?? data;
  }

  const body = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const message =
    (typeof body.title === 'string' && body.title) ||
    (typeof body.message === 'string' && body.message) ||
    (status === 401
      ? 'Not authenticated'
      : status === 403
        ? 'Forbidden'
        : status === 404
          ? 'Not found'
          : error.message);

  return new OdinV2ApiError(
    message,
    status,
    typeof body.errorCode === 'string' ? body.errorCode : undefined,
    data
  );
};

/** Runs a V2 call and rethrows failures as OdinV2ApiError. */
export const withV2Errors = async <T>(
  dotYouClient: BaseDotYouClient,
  call: () => Promise<T>
): Promise<T> => {
  try {
    return await call();
  } catch (error) {
    throw await toOdinV2ApiError(error, dotYouClient.getSharedSecret());
  }
};
