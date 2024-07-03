# First draft of a potential new api v2 structure:

# File Management

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

`/api/apps/v1/drive/files/thumb`\
`/api/owner/v1/drive/query/specialized/cuid/thumb`\
=> [GET] `/api/apps/v2/drive/files/thumb` (request object with option for uniqueId)

`/api/apps/v1/drive/files/payload`\
`/api/owner/v1/drive/query/specialized/cuid/payload`\
=> [GET] `/api/apps/v2/drive/files/payload` (request object with option for uniqueId)

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

# File queries

`/api/owner/v1/drive/query/batch`\
=> [GET] `/api/owner/v2/drive/query/batch`

`/api/owner/v1/drive/query/batchcollection`\
=> [GET] `/api/owner/v2/drive/query/batch/collection`

`/api/owner/v1/drive/query/modified`\
=> [GET] `/api/owner/v2/drive/query/modified`

# Connections

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
