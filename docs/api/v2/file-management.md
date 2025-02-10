# File Management

## Direct

> TM: question: if we manage to reduce down to driveId, does it make sense to consider putting the driveId and fileId in the URL? (i suppose this concept is broken by our shared secret encyption)
> SC: Yes, as the shared secret encryption is based on an IV which is a MD5 hash of the data

`/api/apps/v1/drive/files/delete`\
`/api/apps/v1/drive/files/deletefileidbatch`\
`/api/apps/v1/drive/files/deletegroupidbatch`\
`/api/apps/v1/drive/files/harddelete`\
=> [DELETE] `/api/{guest/apps/owner}/v2/drive/files` (request object with one or more fileId, groupId + option to hard delete)

`/api/apps/v1/drive/files/upload`\
=> [POST] `/api/{guest/apps/owner}/v2/drive/files`

`/api/apps/v1/drive/files/header`\
`/api/owner/v1/drive/query/specialized/cuid/header`\
=> [GET] `/api/{guest/apps/owner}/v2/drive/files/header` (request object with option for fileId/uniqueId/globalTransitId)

> TM: given that gtid is now on every file, we should also consider an option for gtid when getting header/thumb/payload. not sure if that just goes next to the uniqueId and we only allow one at a time or if there's some other smoother way you can do it. (i.e. there is a UID field with a uidType {gtid | clientUid}.

`/api/apps/v1/drive/files/thumb`\
`/api/owner/v1/drive/query/specialized/cuid/thumb`\
=> [GET] `/api/{guest/apps/owner}/v2/drive/files/thumb` (request object with option for fileId/uniqueId/globalTransitId)

`/api/apps/v1/drive/files/payload`\
`/api/owner/v1/drive/query/specialized/cuid/payload`\
=> [GET] `/api/{guest/apps/owner}/v2/drive/files/payload` (request object with option for fileId/uniqueId/globalTransitId)

`/api/apps/v1/drive/files/deletepayload`\
=> [DELETE] `/api/{guest/apps/owner}/v2/drive/files/payload`

`/api/apps/v1/drive/files/send-read-receipt`\
=> [POST] `/api/{guest/apps/owner}/v2/drive/files/read-receipts`

## Over peer

`/api/apps/v1/transit/sender/files/delete`\
`/api/apps/v1/transit/sender/files/deletefileidbatch`\
`/api/apps/v1/transit/sender/files/deletegroupidbatch`\
`/api/apps/v1/transit/sender/files/harddelete`\
`/api/owner/v1/transit/sender/files/senddeleterequest`\
=> [DELETE] `/api/{apps/owner}/v2/peer/files` (request object with one or more fileId, groupId + option to hard delete)

`/api/owner/v1/transit/sender/files/send`\
=> [POST] `/api/{apps/owner}/v2/peer/files`

`/api/apps/v1/transit/files/deletepayload`\
=> [DELETE] `/api/{apps/owner}/v2/peer/files/payload`

`/api/apps/v1/transit/files/header`\
`/api/owner/v1/transit/query/specialized/cuid/header`\
`/api/apps/v1/transit/query/header_byglobaltransitid`\
=> [GET] `/api/{apps/owner}/v2/peer/files/header` (request object with option for fileId/uniqueId/globalTransitId)

`/api/apps/v1/transit/query/thumb`\
`/api/owner/v1/transit/query/specialized/cuid/thumb`\
`/api/apps/v1/transit/query/thumb_byglobaltransitid`\
=> [GET] `/api/{apps/owner}/v2/peer/files/thumb` (request object with option for fileId/uniqueId/globalTransitId)

`/api/apps/v1/transit/query/payload`\
`/api/owner/v1/transit/query/specialized/cuid/payload`\
`/api/apps/v1/transit/query/payload_byglobaltransitid`\
=> [GET] `/api/{apps/owner}/v2/peer/files/payload` (request object with option for fileId/uniqueId/globalTransitId)
