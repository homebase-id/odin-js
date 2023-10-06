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
const INVALID_CLASSNAME = 'invalid';
const LOADING_CLASSNAME = 'loading';

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

  const localDomainComplete = (domain: string) => {
    const strippedIdentity = stripIdentity(domain);
    if (strippedIdentity.split('.').length >= 2) return true;

    mainForm.classList.remove(INVALID_CLASSNAME);
    return false;
  };

  const localDomainCheck = (domain: string) => {
    const strippedIdentity = stripIdentity(domain);
    if (domainRegex.test(strippedIdentity)) {
      mainForm.classList.remove(INVALID_CLASSNAME);
      return true;
    }
    mainForm.classList.add(INVALID_CLASSNAME);
    return false;
  };

  const debouncedDomainValidator = debounce(async (e) => {
    if (!localDomainComplete(e.target.value)) return;
    mainForm.classList.toggle(INVALID_CLASSNAME, !localDomainCheck(e.target.value));
  }, 500);

  dotyouInputBox.addEventListener('keydown', debouncedDomainValidator);

  const pingIdentity = async (identity: string) => {
    return await fetch(`https://${identity}/api/guest/v1/auth/ident`)
      .then((response) => response.json())
      .then((validation) => validation?.odinId.toLowerCase() === identity)
      .catch(() => false);
  };

  const storagePartioned = await checkStorageAccess();
  mainForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!localDomainCheck(dotyouInputBox.value)) return;
    mainForm.classList.add(LOADING_CLASSNAME);

    const strippedIdentity = stripIdentity(dotyouInputBox.value);
    if (!(await pingIdentity(strippedIdentity))) {
      mainForm.classList.add(INVALID_CLASSNAME);
      mainForm.classList.remove(LOADING_CLASSNAME);
      return;
    }

    // If storage is partioned, try and request access to store the identity
    if (storagePartioned) await requestStorageAccess();
    storeIdentityAndAuthorize(strippedIdentity, urlParams);

    return false;
  });

  const fillIdentityFromStorage = () => {
    const previousIdentity = getIdentityFromStorage();
    if (!dotyouInputBox.value && previousIdentity) dotyouInputBox.value = previousIdentity;
  };

  // If storage is partioned, onclick of the input box, requestAccess to fill in with a previous known identity
  if (storagePartioned) {
    dotyouInputBox.addEventListener('click', async (e) => {
      if (!e.target || 'value' in e.target) return;
      if ((e.target as HTMLInputElement).value) return;

      requestStorageAccess().then(() => fillIdentityFromStorage());
    });
  } else fillIdentityFromStorage();
};
