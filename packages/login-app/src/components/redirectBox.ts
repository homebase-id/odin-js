const setupHtml = () => {
  document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
      <div class="max-w-sm m-auto px-3 w-full">
        <h1 class="text-xl">Open page in your Homebase identity?</h1>
        <p>You've been linked to this page in your identity</p>
        <input type="text" readonly id="target"/>

        <button class="open">Open link</button>
        <p class="my-3 text-center">or</p>
        <button class="cancel">Go back</button>
      </div>`;
};

export const RedirectBox = async (target: string, onConfirm: () => void, onCancel: () => void) => {
  setupHtml();

  const targetInput = document.getElementById('target') as HTMLInputElement;
  targetInput.value = target;

  const openButton = document.querySelector('.open') as HTMLButtonElement;
  const cancelButton = document.querySelector('.cancel') as HTMLButtonElement;

  openButton.addEventListener('click', onConfirm);
  cancelButton.addEventListener('click', onCancel);
};
