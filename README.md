# HOMEBASE.ID (ODIN-JS)

##### Open Decentralized Identity Network

[![CI Build](https://github.com/YouFoundation/dotyoucore-js/actions/workflows/ci.yml/badge.svg)](https://github.com/YouFoundation/dotyoucore-js/actions/workflows/ci.yml)

####

This monorepo contains the various JavaScript apps and libraries that are maintaned by Homebase. The libraries can easily be consumed by other app developers that want to work with a Homebase Identity backend.

- 🚀 Feed app
- 🚀 Chat app
- 🚀 Mail app
- 🚀 Community app
- 🚀 Public app
- 🚀 Owner app
- 📚 JS Lib
- ✨ UI Lib

The feed, chat, mail, and community apps are designed as stand-alone platform apps and will likely at some point be pulled out of the mono-repo.

## Installing Locally

### Libraries:

To use the libraries you can just install them from Github Packages: [JS-Lib](https://github.com/YouFoundation/dotyoucore-js/pkgs/npm/js-lib) & [UI-Lib](https://github.com/YouFoundation/dotyoucore-js/pkgs/npm/ui-lib)

The libraries expect a `DotYouClient`. The `DotYouClient` holds the authentication parameters for the specific request.

### Apps:

In order to get everything running you'll need the back-end web server, see the repo [https://github.com/YouFoundation/dotyoucore](https://github.com/YouFoundation/dotyoucore)

Before you can use the actual apps, you need to install and build the dependencies:

`npm install && npm run build:libs`

After that you can run the apps locally:

All concurrently `npm run start` or one by one `npm run start:[feed/chat/mail/community/public/owner]`

and/or build them:

`npm run build`

## Security Disclosures

If you discover any security issues, please send an email to [info@homebase.id](mailto:info@homebase.id). The email is automatically CCed to the entire team and we'll respond promptly.

## License (Apps: AGPL3 & Libraries: MIT)

The repository and any apps are licensed under AGPL3 while the libraries under MIT
See ./LICENSE for the details;
