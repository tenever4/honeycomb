# Caspian

Tool for loading and visualizing various robot projects.

## Use

### Web

- run `yarn install` from the root directory of the repository
- run `yarn start` from this directory
- navigate to `http://localhost:9000/#/(PATH_TO_CONFIG_FILE)`

### Desktop App (Electron)

#### Development

- open two terminal windows
- run `yarn build` in first terminal window
- run `yarn electron` in second window

#### Build

- run `yarn build:electron`
- this will create a distributable electron application on whatever host platform the command was run on

#### Notes

- during development, if you'd like to specify a default config to load, edit "electron" in `package.json`
  - provide a global path to the config file you'd like the app to load when it first loads
  - example: `"electron": "electron ./src/electron/app.js GLOBAL_PATH_TO_CONFIG"`
  - currently must be the THIRD command line argument
- when running `yarn electron`, it will only work if you pick `.json` config files
  - this is due to an expectation of the MSL urdf model being packaged together with the built electron application
