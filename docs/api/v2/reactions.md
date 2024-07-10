# Reactions

## New

`/api/apps/v1/unified-reactions/add`\
=> [POST] `/api/apps/v1/unified-reactions`\

`/api/apps/v1/unified-reactions/delete`\
=> [DELETE] `/api/apps/v1/unified-reactions`\

`/api/apps/v1/unified-reactions/summary`\
=> [GET] `/api/apps/v1/unified-reactions/summary`\

`/api/apps/v1/unified-reactions/list`\
=> [GET] `/api/apps/v1/unified-reactions/list`\

`/api/apps/v1/unified-reactions/listbyidentity`\
=> [GET] `/api/apps/v1/unified-reactions/list?groupBy=identity`\

## Current (Deprecated)

### Direct

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

### Over peer

`/api/apps/v1/transit/files/reactions/add`\
=> [POST] `/api/apps/v2/peer/files/reactions`

`/api/apps/v1/transit/files/reactions/delete`\
=> [DELETE] `/api/apps/v2/peer/files/reactions`

`/api/apps/v1/transit/files/reactions/deleteall`\
=> [DELETE] `/api/apps/v2/peer/files/reactions/all`

`/api/apps/v1/transit/files/reactions/list`\
=> [GET] `/api/apps/v2/peer/files/reactions`

`/api/apps/v1/transit/files/reactions/listbyidentity`\
=> [GET] `/api/apps/v2/peer/files/reactions?groupBy=identity`

`/api/apps/v1/transit/files/reactions/summary`\
=> [GET] `/api/apps/v2/peer/files/reactions/summary`
