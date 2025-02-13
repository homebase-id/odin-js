import { LoginBox } from '../components/loginBox';
import { authorize } from '../helpers/identity';

export const Logon = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const isDarkMode = urlParams.get('isDarkMode') === 'true';
  urlParams.delete('isDarkMode');

  document.documentElement.classList.toggle('dark', isDarkMode);

  LoginBox((identity) => authorize(identity, urlParams), false, true);
};
