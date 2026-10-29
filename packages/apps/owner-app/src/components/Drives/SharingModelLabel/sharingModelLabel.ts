import { t } from '@homebase-id/common-app';
import { DriveSharingModel } from '@homebase-id/js-lib/core';

/** How the console names a zero-knowledge drive's model; undefined for a drive whose key the server holds. */
export const zeroKnowledgeLabel = (model: DriveSharingModel | null | undefined) =>
  model === 'private'
    ? t('Private (zero knowledge)')
    : model === 'selectiveShare'
      ? t('Selective Share (zero knowledge)')
      : undefined;
