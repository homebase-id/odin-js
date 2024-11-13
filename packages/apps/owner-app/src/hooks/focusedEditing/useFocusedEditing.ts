import { useSearchParams } from 'react-router-dom';

export const useFocusedEditing = () => {
  const [searchParams] = useSearchParams();

  const checkReturnTo = (state?: string) => {
    let returnUrl = searchParams.get('return');
    if (
      (searchParams.get('ui') !== 'focus' && searchParams.get('ui') !== 'minimal') ||
      !returnUrl
    ) {
      return;
    }

    if (state) {
      if (returnUrl.indexOf('?') !== -1) {
        returnUrl += `&status=${state}`;
      } else {
        returnUrl += `?status=${state}`;
      }
    }

    window.location.href = returnUrl;
  };

  return checkReturnTo;
};
