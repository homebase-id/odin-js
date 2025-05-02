# Odin Image

Before you can interact with any data on a Homebase Identity you need a instance of a `OdinClient`. Based on the authorization level different underlying api endpoints will be called, and different authorization keys will be expected. With the `OdinClient` you pass alongs these properties as a single strongly-typed object.

Look at the [OdinClient documentation](https://github.com/YouFoundation/dotyoucore-js/blob/main/docs/js-lib/core/OdinClient.md) for more info.

```
<OdinImage
  odinClient={odinClient}
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
  odinClient={odinClient}
  fileId={fileId}
  fileKey={payloadKey}
  targetDrive={targetDrive}
  lastModified={lastModified}
  probablyEncrypted={true}
  autoPlay={true}
/>
```
