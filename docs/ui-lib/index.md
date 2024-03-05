# Odin Image

Before you can interact with any data on a Homebase Identity you need a instance of a `DotYouClient`. Based on the authorization level different underlying api endpoints will be called, and different authorization keys will be expected. With the `DotYouClient` you pass alongs these properties as a single strongly-typed object.

Look at the [DotYouClient documentation](https://github.com/YouFoundation/dotyoucore-js/blob/main/docs/js-lib/core/DotYouClient.md) for more info.

```
<OdinImage
  dotYouClient={dotYouClient}
  fileId={fileId}
  fileKey={payloadKey}
  lastModified={lastModified}
  targetDrive={targetDrive}
  className={``}
/>
```

# Odin Video

```
<OdinVideo
  dotYouClient={dotYouClient}
  fileId={fileId}
  fileKey={payloadKey}
  targetDrive={targetDrive}
  lastModified={lastModified}
  probablyEncrypted={true}
  autoPlay={true}
/>
```
