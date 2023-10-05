import {
  checkStorageAccess,
  getIdentityFromStorage,
  requestStorageAccess,
  storeIdentityAndAuthorize,
  stripIdentity,
} from './identity';
import { debounce } from 'lodash-es';

const setupHtml = () => {
  document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
    <form id="main" class="form">
        <h1 class="text-lg">YouAuth</h1>
        <div class="label-group">
            <label htmlFor="homebase-id" class="text-sm leading-7 text-gray-600">
                Homebase Id
            </label>
            <span class="invalid-msg">Invalid identity</span>
        </div>
        <input type="text" name="homebase-id" id="homebase-id" required />
        <button class="login">Login</button>
    </form>
    <p class="my-3 text-center">or</p>
    <a class="signup" href="https://homebase.id/sign-up" target="_blank">Signup</a>`;
};

const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9]{2,25}(?::\d{1,5})?$/i;

export const setupLogon = async () => {
  setupHtml();

  const urlParams = new URLSearchParams(window.location.search);
  const isDarkMode = urlParams.get('isDarkMode') === 'true';
  urlParams.delete('isDarkMode');

  document.documentElement.classList.toggle('dark', isDarkMode);

  const mainForm = document.getElementById('main');
  const dotyouInputBox: HTMLInputElement | null = document.getElementById(
    'homebase-id'
  ) as HTMLInputElement;

  if (!mainForm || !dotyouInputBox) return;

  const pingIdentity = async (identity: string) => {
    return await fetch(`https://${identity}/api/guest/v1/auth/ident`)
      .then((response) => response.json())
      .then((validation) => validation?.odinId.toLowerCase() === identity)
      .catch(() => false);
  };

  const debouncedDomainValidator = debounce(async (e) => {
    const strippedIdentity = stripIdentity(e.target.value);
    const isComplete = strippedIdentity.split('.').length >= 2;

    if (!isComplete) return mainForm.classList.remove('invalid');

    const isValid = domainRegex.test(strippedIdentity);

    mainForm.classList.toggle('invalid', !isValid);
  }, 500);

  dotyouInputBox.addEventListener('keydown', debouncedDomainValidator);

  const fillIdentityFromStorage = () => {
    const previousIdentity = getIdentityFromStorage();
    if (!dotyouInputBox.value && previousIdentity) dotyouInputBox.value = previousIdentity;
  };

  const storagePartioned = await checkStorageAccess();
  mainForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (mainForm.classList.contains('invalid')) return;
    mainForm.classList.add('loading');

    const strippedIdentity = stripIdentity(dotyouInputBox.value);
    if (!(await pingIdentity(strippedIdentity))) {
      mainForm.classList.add('invalid');
      mainForm.classList.remove('loading');
      return;
    }

    // If storage is partioned, onclick of the input box, requestAccess to store the identity (We need a user interaction before we can request access)
    if (storagePartioned) await requestStorageAccess();
    storeIdentityAndAuthorize(strippedIdentity, urlParams);

    return false;
  });

  // If storage is partioned, onclick of the input box, requestAccess to fill in with a previous known identity
  if (storagePartioned) {
    dotyouInputBox.addEventListener('click', async (e) => {
      if (!e.target || 'value' in e.target) return;

      if ((e.target as HTMLInputElement).value) return;
      requestStorageAccess().then(() => {
        fillIdentityFromStorage();
      });
    });
  } else fillIdentityFromStorage();
};
