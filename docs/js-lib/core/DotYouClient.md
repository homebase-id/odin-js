# DotYouClient

Before you can interact with any data on a Homebase Identity you need a instance of a `DotYouClient`. Based on the authorization level different underlying api endpoints will be called, and different authorization keys will be expected. With the `DotYouClient` you pass alongs these properties as a single strongly-typed object.

```
const headers = {
    bx0900 = BASE64_APP_AUTH_TOKEN;
};

new DotYouClient({
  sharedSecret: BASE64_APP_SHAREDSECRET,
  api: ApiType.App,
  identity: `frodo.dotyou.cloud`,
  headers: headers,
});
```
