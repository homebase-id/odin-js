Admin:
/api/admin/v1/ping
/api/admin/v1/tenants
/api/admin/v1/tenants/{domain}
/api/admin/v1/tenants/{domain}/export
/api/admin/v1/tenants/{domain}/enable
/api/admin/v1/tenants/{domain}/disable
/api/job/v1/{jobKey}
/api/job/v1/dummy

Guest:
/api/guest/v1/builtin/home/data/cacheable/invalidate
/api/guest/v1/builtin/home/data/cacheable/qbc
/api/guest/v1/public/keys/notifications_pk

Owner:
/api/owner/v1/youauth/authorize
/api/owner/v1/youauth/token

Registration:
/api/registration/v1/registration/can-connect-to/{domain}/{port}
/api/registration/v1/registration/create-identity-on-domain/{domain}
/api/registration/v1/registration/create-managed-domain/{apex}/{prefix}
/api/registration/v1/registration/delete-managed-domain/{apex}/{prefix}
/api/registration/v1/registration/delete-own-domain/{domain}
/api/registration/v1/registration/did-dns-records-propagate/{domain}
/api/registration/v1/registration/has-valid-certificate/{domain}
/api/registration/v1/registration/is-managed-domain-available/{apex}/{prefix}
/api/registration/v1/registration/is-own-domain-available/{domain}
/api/registration/v1/registration/is-valid-domain/{domain}
/api/registration/v1/registration/is-valid-invitation-code/{code}
/api/registration/v1/registration/lookup-zone-apex/{domain}
/api/registration/v1/registration/managed-domain-apexes
/api/registration/v1/registration/own-domain-dns-status/{domain}

System:
/api/v1/version
/cdn/{filename}
/pub/image
/pub/profile

Transit:
/api/apps/v1/transit/query/metadata/type
