import { describe, expect, it, vi } from 'vitest';
import { RecipientTransferHistory, TransferStatus } from '@homebase-id/js-lib/core';
import { ChatDeliveryStatus, transferHistoryToChatDeliveryStatus } from './ChatProvider';

// common-app reads window on import, and nothing here uses it
vi.mock('@homebase-id/common-app', () => ({}));

const history = (overrides: Partial<RecipientTransferHistory>): RecipientTransferHistory => ({
  recipient: 'frodo.dotyou.cloud',
  lastUpdated: 0,
  latestTransferStatus: TransferStatus.None,
  isInOutbox: false,
  latestSuccessfullyDeliveredVersionTag: null,
  isReadByRecipient: false,
  ...overrides,
});

describe('transferHistoryToChatDeliveryStatus', () => {
  it('is Failed without a history', () => {
    expect(transferHistoryToChatDeliveryStatus(undefined)).toBe(ChatDeliveryStatus.Failed);
  });

  it('is Sent while nothing has happened yet', () => {
    expect(transferHistoryToChatDeliveryStatus(history({}))).toBe(ChatDeliveryStatus.Sent);
  });

  it.each([
    TransferStatus.RecipientIdentityReturnedVersionTagMismatch,
    TransferStatus.RecipientIdentityReturnedInvalidKeyHeader,
    TransferStatus.RecipientIdentityReturnedBadRequest,
  ])('is Failed on %s before anything was delivered', (latestTransferStatus) => {
    expect(transferHistoryToChatDeliveryStatus(history({ latestTransferStatus }))).toBe(
      ChatDeliveryStatus.Failed
    );
  });

  it('shows a refused update as Failed although an earlier version was delivered and read', () => {
    expect(
      transferHistoryToChatDeliveryStatus(
        history({
          latestTransferStatus: TransferStatus.RecipientIdentityReturnedVersionTagMismatch,
          latestSuccessfullyDeliveredVersionTag: 'an-earlier-version',
          isReadByRecipient: true,
        })
      )
    ).toBe(ChatDeliveryStatus.Failed);
  });

  it('is Delivered, then Read, once the latest send got through', () => {
    const delivered = {
      latestTransferStatus: TransferStatus.Delivered,
      latestSuccessfullyDeliveredVersionTag: 'the-version',
    };

    expect(transferHistoryToChatDeliveryStatus(history(delivered))).toBe(
      ChatDeliveryStatus.Delivered
    );
    expect(
      transferHistoryToChatDeliveryStatus(history({ ...delivered, isReadByRecipient: true }))
    ).toBe(ChatDeliveryStatus.Read);
  });

  describe('a recipient out of storage is waiting, not failed', () => {
    const latestTransferStatus = TransferStatus.RecipientIdentityOutOfStorage;

    it('is Sent before anything was delivered', () => {
      expect(transferHistoryToChatDeliveryStatus(history({ latestTransferStatus }))).toBe(
        ChatDeliveryStatus.Sent
      );
    });

    it('stays Delivered when an earlier version got through', () => {
      expect(
        transferHistoryToChatDeliveryStatus(
          history({
            latestTransferStatus,
            latestSuccessfullyDeliveredVersionTag: 'an-earlier-version',
          })
        )
      ).toBe(ChatDeliveryStatus.Delivered);
    });
  });
});
