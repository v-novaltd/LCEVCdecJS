# Building LCEVCdec.js.

## Getting code

Clone repository via git:

```bash
git clone https://github.com/v-novaltd/LCEVCdecJS
```

## LCEVCdec

For building LCEVCdecJS we use Rollup. In the `package.json` we can
find the different commands we can run and also see all the development
dependencies and dependencies of the project.

First we need to download all the dependencies of the project:

```bash
npm install
```

Then, we can build it:

```bash
npm run build
```

This will create a folder `dist` with the built LCEVCdec inside of it.

## Install LCEVCdecJS Libs from a public internal registry

```bash
npm install git-rev-sync

npm install lcevc_dec.js@3.8.0-test --registry=https://nexus.dev.v-nova.com/repository/v-nova-npm-public/
```