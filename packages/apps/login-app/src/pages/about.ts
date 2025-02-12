const setupHtml = () => {
  document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
    <div class="max-w-xl min-h-screen mx-auto p-4 flex flex-col items-center justify-center">
      <div class="flex flex-col gap-4">
          <h2 class="text-2xl">Welcome to anon.homebase.id</h2>
          <p>This site does not track users or collect any personal information; its sole purpose is to enhance the user experience during the Homebase YouAuth login process.</p>
          <p>anon.homebase.id is a domain that hosts a JavaScript snippet for the YouAuth login process, providing a seamless user experience without compromising privacy. It saves your Homebase identity in your browser's local storage, ensuring no cookies or tracking mechanisms are involved. If you're security-conscious and prefer not to use local storage, you can simply disallow it for homebase.id; the only consequence is that you'll have to type your identity each time you open the login box.</p>
          <p>While this domain is an integral part of the Homebase project, designed to make decentralized authentication both user-friendly and secure, it is not mandatory to use anon.homebase.id. Websites can choose to copy the JavaScript snippet and host it on their own site, further empowering decentralization and flexibility.</p>
        </div>
    </div>`;
};

export const About = () => setupHtml();
