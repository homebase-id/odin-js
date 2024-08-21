# dotyoucore-js

[![CI Build](https://github.com/YouFoundation/dotyoucore-js/actions/workflows/ci.yml/badge.svg)](https://github.com/YouFoundation/dotyoucore-js/actions/workflows/ci.yml)

This monorepo contains the various JavaScript apps and libraries that are maintaned by Homebase. The libraries can easily be consumed by other app developers that want to work with a Homebase Identity backend.

# Installing Locally

## Libraries:
To use the libraries you can just install them from Github Packages: [JS-Lib](https://github.com/YouFoundation/dotyoucore-js/pkgs/npm/js-lib) & [UI-Lib](https://github.com/YouFoundation/dotyoucore-js/pkgs/npm/ui-lib)

The libraries expect a `DotYouClient`. The `DotYouClient` holds the authentication parameters for the specific request.

## Apps:

Before you can use the actual apps, you need to install and build the dependencies:

`npm install && npm run build:libs`

After that you can run the apps locally:

`npm run start`

and/ore build them:

`npm run build`

# Security Disclosures

If you discover any security issues, please send an email to [security@homebase.id](mailto:security@homebase.id). We'll respond promptly.

# License (Apps: AGPL3 & Libraries: MIT)
The repository and any apps are licensed under AGPL3 while the libraries under MIT
See ./LICENSE per package for the details;
