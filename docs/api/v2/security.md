# Security

## Context

### Direct

`/api/apps/v1/security/context`\
=> [GET] `/api/apps/v2/security/context`

### Over Transit

`/api/apps/v1/transit/query/security/context`\
=> [GET] `/api/apps/v2/transit/security/context`

## Account

`/api/owner/v1/security/account-status`\
=> [GET] `/api/owner/v2/security/account`

`/api/owner/v1/security/recovery-key`\
=> [GET] `/api/owner/v2/security/recovery`

`/api/owner/v1/security/resetpasswd`\
=> [POST] `/api/owner/v2/security/password`

`/api/owner/v1/security/delete-account`\
=> [DELETE] `/api/owner/v2/security/account/delete`

`/api/owner/v1/security/undelete-account`\
=> [POST] `/api/owner/v2/security/account/undelete`

## Keys

`/api/guest/v1/public/keys/offline`\
=> [GET] `/api/guest/v1/public/keys/offline`

`/api/guest/v1/public/keys/offline_ecc`\
=> [GET] `/api/guest/v1/public/keys/offline_ecc`

`/api/guest/v1/public/keys/online`\
=> [GET] `/api/guest/v1/public/keys/online`

`/api/guest/v1/public/keys/online_ecc`\
=> [GET] `/api/guest/v1/public/keys/online_ecc`

`/api/guest/v1/public/keys/signing`\
=> [GET] `/api/guest/v1/public/keys/signing`
