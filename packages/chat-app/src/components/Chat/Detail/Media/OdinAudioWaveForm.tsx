import { useEffect, useMemo, useRef, useState } from 'react';
import { AudioSource, useAudio } from './OdinAudio';
import { DotYouClient } from '@youfoundation/js-lib/core';

// const chunkSize = 250;

export interface OdinAudioWaveformProps
  extends AudioSource,
    React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> {
  probablyEncrypted?: boolean;
  dotYouClient: DotYouClient;
  isDarkMode: boolean;
}

export const OdinAudioWaveForm = (props: OdinAudioWaveformProps) => {
  const {
    dotYouClient,
    odinId,
    fileId,
    globalTransitId,
    fileKey,
    targetDrive,
    systemFileType,
    probablyEncrypted,
    lastModified,
    isDarkMode,

    ...elementProps
  } = props;

  const { data: audioData } = useAudio(
    dotYouClient,
    odinId,
    fileId,
    globalTransitId,
    fileKey,
    targetDrive,
    probablyEncrypted,
    systemFileType,
    lastModified
  ).fetch;

  const sizeDivRef = useRef<HTMLDivElement>(null);
  const cavasRef = useRef<HTMLCanvasElement>(null);

  async function drawToCanvas(audioBlob: Blob) {
    if (!cavasRef.current || !sizeDivRef.current) return;
    const ctx = cavasRef.current.getContext('2d');
    if (!ctx) return;

    const ac = new AudioContext();
    const { clientHeight: height, clientWidth: width } = sizeDivRef.current;
    const centerHeight = Math.ceil(height / 2);

    const buffer = await audioBlob.arrayBuffer();
    const audioBuffer = await ac.decodeAudioData(buffer);
    const float32Array = audioBuffer.getChannelData(0);

    const chunkedArray = [];
    const chunkSize = Math.ceil(float32Array.length / width); // Make it fit in the avaialble width

    let i = 0;
    const length = float32Array.length;
    while (i < length) {
      chunkedArray.push(
        float32Array
          .slice(i, (i += chunkSize))
          .reduce((total, value) => total + Math.abs(value), 0) / chunkSize
      );
    }

    cavasRef.current.height = height;
    cavasRef.current.width = width;

    const maxValue = Math.max(...chunkedArray) * height;
    const maxHeight = height * 0.7;
    const scaleFactor = (maxHeight / maxValue) * maxHeight; // Make it fit in the available height

    for (const index in chunkedArray) {
      ctx.strokeStyle = isDarkMode ? '#fafafa' : '#161616';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(Number(index), centerHeight - chunkedArray[index] * scaleFactor);
      ctx.lineTo(Number(index), centerHeight + chunkedArray[index] * scaleFactor);
      ctx.stroke();
    }
  }

  const audioBlob = useMemo(
    () => audioData && new Blob([audioData.bytes], { type: audioData.contentType }),
    [audioData]
  );

  useEffect(() => {
    if (!audioBlob) return;
    drawToCanvas(audioBlob);
  }, [audioBlob, isDarkMode]);

  return (
    <div
      {...elementProps}
      ref={sizeDivRef}
      className={`aspect-[5/1] w-full ${elementProps.className}`}
    >
      <canvas
        ref={cavasRef}
        width={sizeDivRef.current?.clientWidth}
        height={sizeDivRef.current?.clientHeight}
        className="h-full w-full"
      />
    </div>
  );
};
