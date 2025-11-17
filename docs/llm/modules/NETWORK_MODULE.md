# NETWORK Module Documentation

## Overview
The NETWORK module manages social connections, circles, contacts, follows, and permissions.

**All functions verified from actual source code.**

---

## Circle Management

### Circle Provider
- `CONFIRMED_CONNECTIONS_CIRCLE_ID` = 'bb2683fa402aff866e771a6495765a15'
- `AUTO_CONNECTIONS_CIRCLE_ID` = '9e22b42952f74d2580e11250b651d343'
- `updateCircleDefinition(dotYouClient, circleId, name, description, driveGrants, permissions, disabled?)` - Update circle
- `createCircleDefinition(dotYouClient, name, description, driveGrants, permissions, disabled?)` - Create circle
- `getCircles(dotYouClient)` - Get all circles
- `getCircle(dotYouClient, circleId)` - Get single circle
- `disableCircle(dotYouClient, circleId)` - Disable circle
- `enableCircle(dotYouClient, circleId)` - Enable circle
- `removeCircle(dotYouClient, circleId)` - Delete circle

### Circle Membership
- `addMemberToCircle(dotYouClient, circleId, odinId)` - Add member
- `removeMemberFromCircle(dotYouClient, circleId, odinId)` - Remove member
- `fetchMembersOfCircle(dotYouClient, circleId)` - Get all members

### Domain Membership
- `removeDomainFromCircle(dotYouClient, circleId, domain)` - Remove domain
- `addDomainToCircle(dotYouClient, circleId, domain)` - Add domain

---

## Connection Management

- `disconnectFromContact(dotYouClient, odinId)` - Disconnect
- `getConnections(dotYouClient)` - Get all connections
- `getBlockedConnections(dotYouClient)` - Get blocked
- `getConnectionInfo(dotYouClient, odinId)` - Get connection info

### Connection Requests
- `getPendingRequests(dotYouClient)` - Get pending incoming requests
- `getPendingRequest(dotYouClient, odinId)` - Get single pending request
- `getSentRequests(dotYouClient)` - Get sent requests
- `getSentRequest(dotYouClient, odinId)` - Get single sent request
- `acceptConnectionRequest(dotYouClient, odinId, circleIds?)` - Accept request
- `deletePendingRequest(dotYouClient, odinId)` - Delete pending
- `deleteSentRequest(dotYouClient, odinId)` - Delete sent
- `sendRequest(dotYouClient, odinId, message?)` - Send connection request
- `blockOdinId(dotYouClient, odinId)` - Block identity
- `unblockOdinId(dotYouClient, odinId)` - Unblock identity
- `getDetailedConnectionInfo(dotYouClient, odinId)` - Get detailed info

### Introductions
- `sendIntroduction(dotYouClient, introduceeOdinIds, introduceToOdinIds, message?)` - Send introduction
- `confirmIntroduction(dotYouClient, introducerOdinId, introduceeOdinIds)` - Confirm
- `getReceivedIntroductions(dotYouClient)` - Get received
- `removeAllReceivedIntroductions(dotYouClient, introducer OdinId)` - Remove all

---

## Contact Management

- `CONTACT_PROFILE_IMAGE_KEY` = 'prfl_pic'
- `getContactByOdinId(dotYouClient, odinId)` - Get by Odin ID
- `getContactByUniqueId(dotYouClient, uniqueId)` - Get by unique ID
- `getContacts(dotYouClient)` - Get all contacts

### Contact Types
- `ContactConfig` class
- `ContactDataImage` interface
- `ContactFile` interface
- `RawContact` interface
- `ContactVm` interface

---

## Follow Management

- `fetchFollowing(dotYouClient, cursor?)` - Get following list
- `fetchIdentityIFollow(dotYouClient, odinId)` - Check if following
- `createOrUpdateFollow(dotYouClient, odinId, notificationType?)` - Follow
- `syncFeedHistoryForFollowing(dotYouClient, odinId)` - Sync feed
- `Unfollow(dotYouClient, odinId)` - Unfollow
- `fetchFollowers(dotYouClient, cursor?)` - Get followers
- `fetchFollower(dotYouClient, odinId)` - Get single follower
- `fetchFollowDetail(dotYouClient, odinId)` - Get follow details

---

## Troubleshooting

- `fetchCircleMembershipStatus(dotYouClient, odinId)` - Get membership status
- `verifyConnection(dotYouClient, odinId)` - Verify connection

---

## Permission Types

- `CirclePermissionType` enum
- `AppCirclePermissionType` enum
- `AppPermissionType` enum

---

## Data Types

All type exports from `circle/CircleDataTypes.ts` including:
- `ConnectionRequestHeader`, `CircleNetworkNotification`, `DotYouProfile`
- `ActiveConnection`, `CircleGrant`, `AppGrant`, `AccessGrant`
- `ConnectionRequestOrigin`, `ConnectionInfo`, `IncomingConnectionRequest`
- `ConnectionRequest`, `ContactData`, `AcknowledgedConnectionRequest`
- `CircleDefinition`, `DriveGrant`, `AcceptRequestHeader`, `OdinIdRequest`

---

All exports verified from `packages/libs/js-lib/src/network/`.
