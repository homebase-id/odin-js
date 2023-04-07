export const getMediaSourceFromStream = (stream: ReadableStream<Uint8Array>) => {
  const mediaSource = new MediaSource();
  const objectUrl = URL.createObjectURL(mediaSource);
  mediaSource.addEventListener('sourceopen', async function () {
    URL.revokeObjectURL(objectUrl);

    const sourceBuffer = mediaSource.addSourceBuffer('video/mp4;codecs="avc1.640015,mp4a.40.2"');

    const writable = new WritableStream({
      write(chunk) {
        return new Promise((resolve) => {
          sourceBuffer.appendBuffer(chunk);
          sourceBuffer.addEventListener(
            'updateend',
            () => {
              resolve();
            },
            { once: true }
          );
        });
      },
      close() {
        mediaSource.endOfStream();
      },
    });

    if (stream) stream.pipeTo(writable);
  });

  return objectUrl;
};
