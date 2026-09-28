import { afterEach, expect, test, vi } from 'vitest';
import { DotYouClient } from '../../core/DotYouClient';
import { getLinkPreview } from './LinkPreviewProvider';

const clientThatRejectsWith = (error: unknown) =>
  ({
    createAxiosClient: () => ({ get: () => Promise.reject(error) }),
  }) as unknown as DotYouClient;

afterEach(() => {
  vi.restoreAllMocks();
});

test('getLinkPreview returns null quietly when the server has nothing to preview (404)', async () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  const preview = await getLinkPreview(
    clientThatRejectsWith({ response: { status: 404 } }),
    'https://example.com/nothing-to-preview'
  );

  expect(preview).toBeNull();
  expect(consoleError).not.toHaveBeenCalled();
});

test('getLinkPreview still logs a real failure, and returns null', async () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  const preview = await getLinkPreview(
    clientThatRejectsWith({ response: { status: 500 } }),
    'https://example.com/server-error'
  );

  expect(preview).toBeNull();
  expect(consoleError).toHaveBeenCalledOnce();
});
