import {
  isPartitioned,
  getIdentityFromStorage,
  removeIdentity,
  requestStorageAccess,
  storeIdentity,
  stripIdentity,
} from '../helpers/identity';
import { debounce } from 'lodash-es';

const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9]{2,25}(?::\d{1,5})?$/i;
const LOADING_CLASSNAME = 'loading';

const setupHtml = (isStandalone?: boolean) => {
  document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
    <div class="${isStandalone ? 'max-w-lg m-auto px-3 w-full' : 'max-w-4xl w-full mx-auto'}">
      <form id="main" class="flex flex-col">
        <h1 class="text-lg">YouAuth</h1>
        <div class="flex flex-col">
          <label htmlFor="homebase-id" class="text-sm leading-7 text-gray-600">
            Homebase Id
          </label>
          <div id="selectable-wrapper" class="relative">
            <input class="w-full rounded border border-gray-300 bg-white px-3 py-1 text-base leading-8 text-gray-700 outline-none transition-colors duration-200 ease-in-out focus:border-indigo-500 focus:ring-2 focus:ring-indigo-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 peer invalid:border invalid:border-red-500" type="text" name="homebase-id" list="homebase-identities" id="homebase-id" inputmode="url" autoComplete="off" />
            <span class="absolute -top-[1.7rem] right-0 hidden peer-invalid:block peer-invalid:text-red-500">Invalid identity</span>
            <ul id="homebase-identities" class="bg-white dark:bg-slate-950 border border-gray-300 rounded-b dark:border-gray-700 hidden"></ul>
            <a id="toggle"></a>
          </div>
        </div>

        <button class="cursor-pointer block my-3 rounded-md text-center w-full px-4 py-2 bg-indigo-500 text-white hover:filter hover:brightness-90">Login</button>
      </form>
      <p class="text-center">or</p>
      <a class="block my-3 rounded-md text-center w-full px-4 py-2 bg-slate-200 text-black hover:filter hover:brightness-90" href="https://homebase.id/sign-up" target="_blank">Signup</a>
    </div>`;
};

export const LoginBox = async (
  onSubmit: (identity: string) => void,
  isStandalone?: boolean,
  allowEmptySubmit?: boolean
) => {
  setupHtml(isStandalone);

  const mainForm = document.getElementById('main') as HTMLFormElement;
  const dotyouInputBox: HTMLInputElement | null = document.getElementById(
    'homebase-id'
  ) as HTMLInputElement;

  const selectableWrapper = document.getElementById('selectable-wrapper') as HTMLDivElement;
  const homebaseIdentities = document.getElementById('homebase-identities') as HTMLUListElement;
  const identitiesToggle = document.getElementById('toggle') as HTMLAnchorElement;

  if (
    !mainForm ||
    !dotyouInputBox ||
    !selectableWrapper ||
    !homebaseIdentities ||
    !identitiesToggle
  )
    return;

  const localDomainComplete = (domain: string) => {
    const strippedIdentity = stripIdentity(domain);
    if (strippedIdentity.split('.').length >= 2) return true;

    return false;
  };

  const localDomainCheck = (domain: string) => {
    const strippedIdentity = stripIdentity(domain);
    if (domainRegex.test(strippedIdentity)) {
      dotyouInputBox.setCustomValidity('');
      return true;
    }

    dotyouInputBox.setCustomValidity('Invalid identity');
    return false;
  };

  const debouncedDomainValidator = debounce(async (e) => {
    if (!localDomainComplete(e.target.value)) return;
    localDomainCheck(e.target.value);
  }, 500);

  const replaceSpacesWithDots = () => {
    dotyouInputBox.value = dotyouInputBox.value.replace(/\s/g, '.');
  };

  dotyouInputBox.addEventListener('keydown', debouncedDomainValidator);
  dotyouInputBox.addEventListener('keyup', replaceSpacesWithDots);

  const pingIdentity = async (identity: string) => {
    return await fetch(`https://${identity}/api/guest/v1/auth/ident`)
      .then((response) => response.json())
      .then((validation) => validation?.odinId.toLowerCase() === identity)
      .catch(() => false);
  };

  const storagePartioned = await isPartitioned();
  console.debug('storagePartioned', storagePartioned);
  mainForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (dotyouInputBox.value === '' && allowEmptySubmit) {
      onSubmit('');
      return;
    }

    if (!mainForm.reportValidity()) return;

    if (!localDomainCheck(dotyouInputBox.value)) return;
    mainForm.classList.add(LOADING_CLASSNAME);

    const strippedIdentity = stripIdentity(dotyouInputBox.value);
    if (!(await pingIdentity(strippedIdentity))) {
      mainForm.classList.remove(LOADING_CLASSNAME);
      dotyouInputBox.setCustomValidity('Invalid identity');
      return;
    }

    // If storage is partioned, try and request access to store the identity
    if (storagePartioned) await requestStorageAccess();
    storeIdentity(strippedIdentity);
    onSubmit(strippedIdentity);

    return false;
  });

  const fillIdentityFromStorage = (autoFocused?: boolean) => {
    if (dotyouInputBox.value) return;

    const previousIdentities = getIdentityFromStorage();
    dotyouInputBox.setCustomValidity('');

    if (previousIdentities?.length >= 1) dotyouInputBox.value = previousIdentities[0];
    if (previousIdentities?.length > 1) {
      selectableWrapper.classList.add('selectable-input');
      homebaseIdentities.innerHTML = previousIdentities
        .map(
          (identity) =>
            `<li class="group option hover:bg-slate-200 dark:hover:bg-slate-800 px-3 py-1 cursor-pointer relative" data-identity="${identity}">${identity}<a class="remove absolute inset-0 left-auto flex items-center justify-center px-2 py-1 opacity-50 md:opacity-0 transition-opacity group-hover:opacity-50 hover:opacity-100 "></a></li>`
        )
        .join('');

      homebaseIdentities.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!e.target || !(e.target instanceof HTMLElement)) return;

        if (e.target.classList.contains('remove')) {
          const indentityListItem = e.target.parentElement;
          const identity = indentityListItem?.getAttribute('data-identity');
          if (!identity) return;
          removeIdentity(identity);
          indentityListItem?.remove();
        } else {
          const identity = e.target.getAttribute('data-identity');
          dotyouInputBox.value = identity || '';
          selectableWrapper.classList.remove('show');
          dotyouInputBox.setCustomValidity('');
        }
      });

      document.addEventListener('click', (e) => {
        if (!homebaseIdentities.contains(e.target as Node) && e.target !== dotyouInputBox)
          selectableWrapper.classList.remove('show');
      });

      identitiesToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        selectableWrapper.classList.toggle('show');
      });

      dotyouInputBox.addEventListener('keyup', () => selectableWrapper.classList.remove('show'));
      dotyouInputBox.addEventListener('focus', () => selectableWrapper.classList.add('show'));
      if (autoFocused) selectableWrapper.classList.add('show');
    }
  };

  // If storage is partioned, onclick of the input box, requestAccess to fill in with a previous known identity
  if (storagePartioned) {
    dotyouInputBox.addEventListener('mousedown', (e) => {
      if (!e.target || !(e.target instanceof HTMLInputElement)) return;
      if (e.target.value) return;

      // When we attempt a prefill we don't want to focus the input box
      e.preventDefault();
      e.stopPropagation();

      requestStorageAccess().then(() => fillIdentityFromStorage());
    });
  } else fillIdentityFromStorage();
};
