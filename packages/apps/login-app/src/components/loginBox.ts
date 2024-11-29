import {
  checkStorageAccess,
  getIdentityFromStorage,
  removeIdentity,
  requestStorageAccess,
  storeIdentity,
  stripIdentity,
} from '../helpers/identity';
import { debounce } from 'lodash-es';

const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9]{2,25}(?::\d{1,5})?$/i;
const INVALID_CLASSNAME = 'invalid';
const LOADING_CLASSNAME = 'loading';

const setupHtml = (isStandalone?: boolean, allowEmptySubmit?: boolean) => {
  document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
    <div ${isStandalone ? 'class="max-w-sm m-auto px-3 w-full"' : ''}>
      <form id="main" class="form">
        <h1 class="text-lg">YouAuth</h1>
        <div class="label-group">
          <label htmlFor="homebase-id" class="text-sm leading-7 text-gray-600">
            Homebase Id
          </label>
          <span class="invalid-msg">Invalid identity</span>
        </div>
        <div id="selectable-wrapper">
          <input type="text" name="homebase-id" list="homebase-identities" id="homebase-id" inputmode="url" autoComplete="off" ${!allowEmptySubmit ? 'required' : ''}/>
          <ul id="homebase-identities"></ul>
          <a id="toggle"></a>
        </div>
        <button class="login">Login</button>
      </form>
      <p class="my-3 text-center">or</p>
      <a class="signup" href="https://homebase.id/sign-up" target="_blank">Signup</a>
    </div>`;
};

export const LoginBox = async (
  onSubmit: (identity: string) => void,
  isStandalone?: boolean,
  allowEmptySubmit?: boolean
) => {
  setupHtml(isStandalone, allowEmptySubmit);

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

  const storagePartioned = await checkStorageAccess();
  console.debug('storagePartioned', storagePartioned);
  mainForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (dotyouInputBox.value === '' && allowEmptySubmit) {
      onSubmit('');
      return;
    }

    if (!mainForm.reportValidity()) {
      return;
    }

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
    storeIdentity(strippedIdentity);
    onSubmit(strippedIdentity);

    return false;
  });

  const fillIdentityFromStorage = (autoFocused?: boolean) => {
    if (dotyouInputBox.value) return;

    const previousIdentities = getIdentityFromStorage();
    if (previousIdentities?.length >= 1) dotyouInputBox.value = previousIdentities[0];
    if (previousIdentities?.length > 1) {
      selectableWrapper.classList.add('selectable-input');
      homebaseIdentities.innerHTML = previousIdentities
        .map(
          (identity) =>
            `<li class="option" data-identity="${identity}">${identity}<a class="remove"></a></li>`
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
    dotyouInputBox.addEventListener('click', async (e) => {
      if (!e.target || !(e.target instanceof HTMLInputElement)) return;
      if (e.target.value) return;

      requestStorageAccess().then(() => fillIdentityFromStorage(true));
    });
  } else fillIdentityFromStorage();
};
