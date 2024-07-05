# First draft of a potential new api v2 structure:

## File Management

> TM: question: if we manage to reduce down to driveId, does it make sense to consider putting the driveId and fileId in the URL? (i suppose this concept is broken by our shared secret encyption)
> SC: Yes, as the shared secret encryption is based on an IV which is a MD5 hash of the data

`/api/apps/v1/drive/files/delete`\
`/api/apps/v1/drive/files/deletefileidbatch`\
`/api/apps/v1/drive/files/deletegroupidbatch`\
`/api/apps/v1/drive/files/harddelete`\
=> [DELETE] `/api/apps/v2/drive/files` (request object with one or more fileId, groupId + option to hard delete)

`/api/apps/v1/drive/files/upload`\
=> [POST] `/api/apps/v2/drive/files`

`/api/apps/v1/drive/files/header`\
`/api/owner/v1/drive/query/specialized/cuid/header`\
=> [GET] `/api/apps/v2/drive/files/header` (request object with option for uniqueId)

> TM: given that gtid is now on every file, we should also consider an option for gtid when getting header/thumb/payload. not sure if that just goes next to the uniqueId and we only allow one at a time or if there's some other smoother way you can do it. (i.e. there is a UID field with a uidType {gtid | clientUid}.

`/api/apps/v1/drive/files/thumb`\
`/api/owner/v1/drive/query/specialized/cuid/thumb`\
=> [GET] `/api/apps/v2/drive/files/thumb` (request object with option for uniqueId/globalTransitId)

`/api/apps/v1/drive/files/payload`\
`/api/owner/v1/drive/query/specialized/cuid/payload`\
=> [GET] `/api/apps/v2/drive/files/payload` (request object with option for uniqueId/globalTransitId)

`/api/apps/v1/drive/files/uploadpayload`\
=> [POST] `/api/apps/v2/drive/files/payload`

`/api/apps/v1/drive/files/deletepayload`\
=> [DELETE] `/api/apps/v2/drive/files/payload`

`/api/apps/v1/drive/files/send-read-receipt`\
=> [POST] `/api/apps/v2/drive/files/read-receipts`

`/api/apps/v1/drive/files/reactions/add`\
=> [POST] `/api/apps/v2/drive/files/reactions`

`/api/apps/v1/drive/files/reactions/delete`\
=> [DELETE] `/api/apps/v2/drive/files/reactions`

`/api/apps/v1/drive/files/reactions/deleteall`\
=> [DELETE] `/api/apps/v2/drive/files/reactions/all`

`/api/apps/v1/drive/files/reactions/list`\
=> [GET] `/api/apps/v2/drive/files/reactions`

`/api/apps/v1/drive/files/reactions/listbyidentity`\
=> [GET] `/api/apps/v2/drive/files/reactions?groupBy=identity`

`/api/apps/v1/drive/files/reactions/summary`\
=> [GET] `/api/apps/v2/drive/files/reactions/summary`

## File queries

> TM: these are all GETs, what happens when the query is too large for the url?
> SC: Would argue that the risk would mostly be there on batch/collections; But I've made them all GET and POST

`/api/owner/v1/drive/query/batch`\
=> [GET][POST] `/api/owner/v2/drive/query/batch`

`/api/owner/v1/drive/query/batchcollection`\
=> [GET][POST] `/api/owner/v2/drive/query/batch/collection`

`/api/owner/v1/drive/query/modified`\
=> [GET][POST] `/api/owner/v2/drive/query/modified`

## Connections

`/api/apps/v1/circles/connections/blocked`\
=> [GET] `/api/apps/v2/circles/connections/blocked`

`/api/apps/v1/circles/connections/block`\
=> [POST] `/api/apps/v2/circles/connections/blocked`

`/api/apps/v1/circles/connections/unblock`\
=> [DELETE] `/api/apps/v2/circles/connections/blocked`

`/api/apps/v1/circles/connections/circles/add`\
=> [POST] `/api/apps/v2/circles/connections/circles/`

`/api/apps/v1/circles/connections/circles/list`\
=> [GET] `/api/apps/v2/circles/connections/circles`

`/api/apps/v1/circles/connections/circles/revoke`\
=> [DELETE] `/api/apps/v2/circles/connections/circles`

`/api/apps/v1/circles/connections/connected`\
=> [GET] `/api/apps/v2/circles/connections/connected`

`/api/apps/v1/circles/connections/disconnect`\
=> [DELETE] `/api/apps/v2/circles/connections/connected`

`/api/apps/v1/circles/connections/status`\
=> [GET] `/api/apps/v2/circles/connections?odinId={ODINID}`

`/api/apps/v1/circles/connections/troubleshooting-info`\
=> [GET] `/api/apps/v2/circles/connections/troubleshooting-info?odinId={ODINID}`

---
