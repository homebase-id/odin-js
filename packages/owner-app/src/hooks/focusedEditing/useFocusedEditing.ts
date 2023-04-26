import { useSearchParams } from 'react-router-dom';

const useFocusedEditing = () => {
  const [searchParams] = useSearchParams();

  const checkReturnTo = (state?: string) => {
    if (searchParams.get('ui') !== 'focus' && searchParams.get('ui') !== 'minimal') {
      return;
    }

    let returnUrl = searchParams.get('return');

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

export default useFocusedEditing;
