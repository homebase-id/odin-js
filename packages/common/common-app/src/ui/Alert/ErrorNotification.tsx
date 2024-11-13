import { useEffect, useRef } from 'react';
import { useErrors } from '../../hooks/errors/useErrors';

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
