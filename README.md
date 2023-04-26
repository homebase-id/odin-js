# dotyoucore-js

## Js Lib

A library that is able to communicate with the DotYouCore api on the 3 main endpoints: youauth / apps / owner

## UI Lib

A library that holds common components which handle the complexity of having no server side knowledge of any contents.

## Usage:

Create an `.npmrc` file within your project with the following details:

`@youfoundation:registry=https://npm.pkg.github.com`

After which you can run:

`npm install @youfoundation/${js/ui}-lib@0.0.1-alpha.xxx`

Do ensure that you are authenticated via npm itself to [Github packages](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)

## Getting started | Js Lib

Every api function expects a `DotYouClient`. The `DotYouClient` holds the authentication parameters for the specific request.

## Getting started | Ui Lib

Every components expects a `DotYouClient`. The `DotYouClient` holds the authentication parameters for the specific request.

## Local development:

Build the library:
`npm run build -workspaces`

In the package.json of the target project add a dependency with a relative path:
`"@youfoundation/${js-lib/ui-lib}": "file:../dotyoucore-js/packages/${lib/ui}"`, and run `npm install` afterwards

NPM will make a symlink between the target project node_modules folder and the source so any updates later in the library are automatically picked up.
