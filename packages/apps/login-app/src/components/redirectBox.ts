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
        <input type="text" readonly id="target" class="w-full rounded border border-outline bg-background px-3 py-1 text-base leading-8 text-foreground outline-none transition-colors duration-200 ease-in-out focus:border-primary focus:ring-2 focus:ring-primary peer invalid:border invalid:border-destructive" />

        <button id="open" class="cursor-pointer block my-3 rounded-md text-center w-full px-4 py-2 bg-primary text-primary-contrast hover:filter hover:brightness-90" >Open link</button>
        ${yourIdentity && yourIdentity?.length ? `<p>Your homebase identity: <span class="text-muted-foreground cursor-pointer inline-flex flex-row gap-1" id="identity-edit">${yourIdentity} <img height="16" width="16" src="/icons/pencil.svg" /></span></p>` : ''}
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
