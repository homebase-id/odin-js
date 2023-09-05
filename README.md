# dotyoucore-js

[![CI Build](https://github.com/YouFoundation/dotyoucore-js/actions/workflows/ci.yml/badge.svg)](https://github.com/YouFoundation/dotyoucore-js/actions/workflows/ci.yml)

This repo contains the various apps and libraries that are maintaned by Homebase. The libraries can be easily consumed by other app developers that want to work with a Homebase Identity backend.

## Apps

The apps are setup indepentently, and can use the first party common app library as well as the public libraries (JS & UI Lib)

### Local development

Before you can use the actual apps, you need to install and build the depencies:

`npm install && npm run build-libs`

After that you can build the apps

`npm run build -w ./packages/{public/owner}-app`

or run them locally

`npm run start -w ./packages/{public/owner}-app`

## Libraries

The libraries expect a `DotYouClient`. The `DotYouClient` holds the authentication parameters for the specific request.

## Usage

Create an `.npmrc` file within your project with the following details:

`@youfoundation:registry=https://npm.pkg.github.com`

After which you can run:

`npm install @youfoundation/${js/ui}-lib@0.0.1-alpha.xxx`

Do ensure that you are authenticated via npm itself to [Github packages](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)

### Js Lib & UI Lib

Js Lib: a library that is able to communicate with the DotYouCore api on the 3 main endpoints: youauth / apps / owner
UI Lib: a library that holds common components which handle the complexity of having no server side knowledge of any contents.
