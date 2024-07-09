# File queries

## Direct

> TM: these are all GETs, what happens when the query is too large for the url?
> SC: Would argue that the risk would mostly be there on batch/collections; But I've made them all GET and POST

`/api/owner/v1/drive/query/batch`\
=> [GET][POST] `/api/owner/v2/drive/query/batch`

`/api/owner/v1/drive/query/batchcollection`\
=> [GET][POST] `/api/owner/v2/drive/query/batch/collection`

`/api/owner/v1/drive/query/modified`\
=> [GET][POST] `/api/owner/v2/drive/query/modified`

## Over Transit

`/api/owner/v1/transit/query/batch`\
=> [GET][POST] `/api/owner/v2/transit/query/batch`

`/api/owner/v1/transit/query/batchcollection`\
=> [GET][POST] `/api/owner/v2/transit/query/batch/collection`

`/api/owner/v1/transit/query/modified`\
=> [GET][POST] `/api/owner/v2/transit/query/modified`
