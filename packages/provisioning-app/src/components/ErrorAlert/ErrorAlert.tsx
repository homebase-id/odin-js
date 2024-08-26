/* eslint-disable @typescript-eslint/no-explicit-any */
import { AxiosError } from 'axios';
import { t } from '../../helpers/i18n/dictionary';
import ActionButton from '../ui/Buttons/ActionButton';
import { Alert } from '@homebase-id/common-app';

export const AlertError = ({ error, doRetry }: { error?: unknown; doRetry?: () => void }) => {
  if (!error) return null;

  return (
    <Alert title={t('Something went wrong')} type="critical" className="my-5">
      <div className="flex flex-row justify-between gap-2">
        {error instanceof AxiosError ? (error.response?.data as any)?.title : t('Unexpected error')}

        {doRetry ? (
          <ActionButton onClick={doRetry} className="ml-2">
            {t('Try again')}
          </ActionButton>
        ) : null}
      </div>
    </Alert>
  );
};
