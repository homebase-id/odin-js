import { t } from '@homebase-id/common-app';
import { DriveSharingModel } from '@homebase-id/js-lib/core';

/**
 * How the console names a drive's model.  A drive or request that names none is Collaborative, as every drive was
 * before the models; undefined only for a model the console doesn't know.
 */
export const sharingModelLabel = (model: DriveSharingModel | null | undefined) =>
  !model || model === 'collaborative'
    ? t('Collaborative')
    : model === 'private'
      ? t('Private (zero knowledge)')
      : model === 'selectiveShare'
        ? t('Selective Share (zero knowledge)')
        : undefined;
