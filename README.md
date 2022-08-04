# Transit-lib

To use the library locally:

Build the library:
`npm run build`

In the package.json of the target project add a dependency with a relative path:
`"@youfoundation/transit-lib": "file:../transit-lib"`, and run `npm install` afterwards

NPM will make a symlink between the target project node_modules folder and the source so any updates later in the library are automatically picked up.

## Typescript

Typescript however doesn't really know how to handle these local packages, and especially their types, so you'll also need to add the following config in the tsconfig.json file:

```
{
  "compilerOptions": {
    ...
    "paths": {
        "@youfoundation/transit-lib": [
            "./node_modules/@youfoundation/transit-lib/*"
        ]
    }
    ...
  }
}
```
