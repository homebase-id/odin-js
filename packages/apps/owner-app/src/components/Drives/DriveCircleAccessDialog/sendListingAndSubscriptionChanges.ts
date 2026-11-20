/**
 * Sends a save's changes to "Allow subscriptions" and "Hide the file list" one after the other, the one being turned
 * off first. The server refuses subscriptions on a drive that hides its file list
 * (cannotAllowSubscriptionsOnDriveThatBlocksEnumeration), so a save that swaps one for the other must never have both
 * on in between. Either change may be missing when that option didn't change.
 */
export const sendListingAndSubscriptionChanges = async (
  newAllowSubscriptions: boolean,
  changeSubscriptions: (() => Promise<unknown>) | undefined,
  changeListing: (() => Promise<unknown>) | undefined
) => {
  const [first, second] = newAllowSubscriptions
    ? [changeListing, changeSubscriptions]
    : [changeSubscriptions, changeListing];

  await first?.();
  await second?.();
};
