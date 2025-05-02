import { useEffect, useMemo, useRef, useState } from 'react';
import { AudioSource } from './OdinAudio';
import { OdinClient } from '@homebase-id/js-lib/core';
import { useAudio } from '../../hooks/audio/useAudio';

export interface OdinAudioWaveformProps
  extends AudioSource,
    React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> {
  probablyEncrypted?: boolean;
  odinClient: OdinClient;
  isDarkMode: boolean;
}

export const OdinAudioWaveForm = (props: OdinAudioWaveformProps) => {
  const {
    odinClient,
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
    odinClient,
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isNoData, setIsNoData] = useState(false);

  const drawToCanvas = async (audioBlob: Blob) => {
    if (!canvasRef.current || !sizeDivRef.current) {
      setIsNoData(true);
      return;
    }
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) {
      setIsNoData(true);
      return;
    }

    try {
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

      if (!canvasRef.current) return;
      canvasRef.current.height = height;
      canvasRef.current.width = width;

      const maxValue = Math.max(...chunkedArray) * height;
      const maxHeight = height * 0.7;
      const scaleFactor = (maxHeight / maxValue) * maxHeight; // Make it fit in the available height

      if (maxValue === 0) {
        setIsNoData(true);
        return;
      }

      for (const index in chunkedArray) {
        ctx.strokeStyle = isDarkMode ? '#fafafa' : '#161616';
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(Number(index), centerHeight - chunkedArray[index] * scaleFactor);
        ctx.lineTo(Number(index), centerHeight + chunkedArray[index] * scaleFactor);
        ctx.stroke();
      }
      setIsNoData(false);
    } catch (e) {
      console.warn('Failed to draw waveform', e);
      setIsNoData(true);
    }
  };

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
      className={`aspect-[10/1] w-full flex ${elementProps.className}`}
    >
      {isNoData ? (
        <p className="m-auto text-slate-400">{'No audio data'}</p>
      ) : (
        <canvas
          ref={canvasRef}
          width={sizeDivRef.current?.clientWidth}
          height={sizeDivRef.current?.clientHeight}
          className="h-full w-full"
        />
      )}
    </div>
  );
};
