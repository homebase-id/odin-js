import { TargetDrive, SystemFileType, DotYouClient } from '@homebase-id/js-lib/core';
import { useAudio } from '../../hooks/audio/useAudio';

export interface AudioSource {
  odinId?: string;
  targetDrive: TargetDrive;

  // File
  fileId: string | undefined;
  globalTransitId?: string | undefined;

  // Payload
  fileKey: string | undefined;

  // File params
  systemFileType?: SystemFileType;
  lastModified?: number;
}

export interface OdinAudioProps
  extends AudioSource,
    React.DetailedHTMLProps<React.AudioHTMLAttributes<HTMLAudioElement>, HTMLAudioElement> {
  probablyEncrypted?: boolean;
  dotYouClient: DotYouClient;
}

export const OdinAudio = (props: OdinAudioProps) => {
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

    ...elementProps
  } = props;
  const { data: audioUrl } = useAudio(
    dotYouClient,
    odinId,
    fileId,
    globalTransitId,
    fileKey,
    targetDrive,
    probablyEncrypted,
    systemFileType,
    lastModified
  ).fetchUrl;

  return (
    <audio
      src={audioUrl || undefined}
      controls
      {...elementProps}
      onClick={(e) => e.stopPropagation()}
    />
  );
};
