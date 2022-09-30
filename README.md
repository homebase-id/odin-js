# dotyoucore-js

## Usage:

Create an `.npmrc` file within your project with the following details:

`@youfoundation:registry=https://npm.pkg.github.com`

After which you can run:

`npm install @youfoundation/dotyoucore-js@0.2.133-alpha.2`

Do ensure that you are authenticated via npm itself to [Github packages](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)

## Local development:

Build the library:
`npm run build`

In the package.json of the target project add a dependency with a relative path:
`"@youfoundation/dotyoucore-js": "file:../dotyoucore-js"`, and run `npm install` afterwards

NPM will make a symlink between the target project node_modules folder and the source so any updates later in the library are automatically picked up.

## Typescript

Typescript however doesn't really know how to handle these local packages, and especially their types, so you'll also need to add the following config in the tsconfig.json file:

```
{
  "compilerOptions": {
    ...
    "paths": {
        "@youfoundation/dotyoucore-js": [
            "./node_modules/@youfoundation/dotyoucore-js/*"
        ]
    }
    ...
  }
}
```
