import { describe, expect, it } from 'vitest';
import { sendListingAndSubscriptionChanges } from './sendListingAndSubscriptionChanges';

const recorder = () => {
  const sent: string[] = [];
  const change = (name: string) => async () => {
    sent.push(name);
  };
  return { sent, change };
};

describe('sendListingAndSubscriptionChanges', () => {
  it('turns subscriptions off before hiding the file list', async () => {
    const { sent, change } = recorder();
    await sendListingAndSubscriptionChanges(false, change('subscriptions'), change('listing'));
    expect(sent).toEqual(['subscriptions', 'listing']);
  });

  it('shows the file list again before turning subscriptions on', async () => {
    const { sent, change } = recorder();
    await sendListingAndSubscriptionChanges(true, change('subscriptions'), change('listing'));
    expect(sent).toEqual(['listing', 'subscriptions']);
  });

  it('sends only what changed', async () => {
    const { sent, change } = recorder();
    await sendListingAndSubscriptionChanges(false, undefined, change('listing'));
    await sendListingAndSubscriptionChanges(true, change('subscriptions'), undefined);
    expect(sent).toEqual(['listing', 'subscriptions']);
  });

  it('stops when the first change is refused', async () => {
    const { sent, change } = recorder();
    const refused = async () => {
      throw new Error('refused');
    };
    await expect(sendListingAndSubscriptionChanges(false, refused, change('listing'))).rejects.toThrow(
      'refused'
    );
    await expect(
      sendListingAndSubscriptionChanges(true, change('subscriptions'), refused)
    ).rejects.toThrow('refused');
    expect(sent).toEqual([]);
  });
});
