import { getIdentityFromStorage } from '../helpers/identity';

const setupHtml = (target: string, yourIdentity?: string) => {
  const targetApp = target.startsWith('/owner')
    ? 'owner'
    : target.startsWith('/apps/community')
      ? 'Homebase Community'
      : target.startsWith('/apps/chat')
        ? 'Homebase Chat'
        : target.startsWith('/apps/feed')
          ? 'Homebase Feed'
          : target.startsWith('/apps/mail')
            ? 'Homebase Mail'
            : null;

  const targetDescription =
    targetApp === 'owner'
      ? `You've been linked to a page in your Homebase owner console`
      : `You've been linked to a page in your <span class="font-bold">"${targetApp}"</span> app`;

  document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
      <div class="max-w-lg px-3 w-full m-auto">
        <h1 class="text-xl mb-2">Open page in your Homebase identity?</h1>
        <p id="target-description" class="mb-3">${targetDescription}</p>
        <input type="text" readonly id="target" class="w-full rounded border border-gray-300 bg-white px-3 py-1 text-base leading-8 text-gray-700 outline-none transition-colors duration-200 ease-in-out focus:border-indigo-500 focus:ring-2 focus:ring-indigo-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 peer invalid:border invalid:border-red-500" />

        <button id="open" class="block my-3 rounded-md text-center w-full px-4 py-2 bg-indigo-500 text-white hover:filter hover:brightness-90" >Open link</button>
        ${yourIdentity && yourIdentity?.length ? `<p>Your homebase identity: <span class="text-slate-500 cursor-pointer inline-flex flex-row gap-1" id="identity-edit">${yourIdentity} <img height="16" width="16" src="/icons/pencil.svg" /></span></p>` : ''}
      </div>`;
};

export const RedirectBox = async (target: string, onConfirm: (identity?: string) => void) => {
  const yourIdentity = getIdentityFromStorage()[0];
  setupHtml(target, yourIdentity);

  const targetInput = document.getElementById('target') as HTMLInputElement;
  targetInput.value = target;

  const openButton = document.querySelector('#open') as HTMLButtonElement;
  openButton.addEventListener('click', () =>
    onConfirm(yourIdentity?.length ? yourIdentity : undefined)
  );

  const identityEdit = document.querySelector('#identity-edit') as HTMLSpanElement;
  identityEdit?.addEventListener('click', () => onConfirm());
};
