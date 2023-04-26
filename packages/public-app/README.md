# Public App

Base React setup built with Typescript and styled with Tailwind CSS

## Getting started:

### Peer dependency: dotyoucore-js

#### Production:

The package.json contains a dependency on the publiched dotyoucore-js library. It receives major releases, and will be adequate for running a local environment.

#### Local:

During development the dotyoucore-js will not receive regular updates as an npm package, so it is advised to make a local install of the dotyoucore-js. The package.json of the public-app is already configured to have the dotyoucore-js relatively located at '../dotyoucore-js'. In a root folder you would then have both the dotyoucore-js and public-app placed next to each other.

[Transit Lib Repo](https://github.com/YouFoundation/dotyoucore-js)

### `npm run start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.
