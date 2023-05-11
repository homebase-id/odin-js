import { useEffect, useRef } from 'react';
import { useErrors } from '@youfoundation/common-app';

export const ErrorNotification = ({ error }: { error: unknown }) => {
  const addError = useErrors().add;
  const handledAnError = useRef(false);

  useEffect(() => {
    if (error && !handledAnError.current) {
      handledAnError.current = true;
      addError(error);
    }
  }, [error]);

  return <></>;
};
