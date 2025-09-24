import fs from 'fs';
import process from 'process';
import path from 'path';
import { glob } from 'glob';

export function getPackageJson() {
  return require(path.resolve(process.cwd(), 'package.json'));
}

export function getPluginJson(srcDir: string) {
  return require(path.resolve(process.cwd(), `${srcDir}/plugin.json`));
}

export function getCPConfigVersion() {
  const cprcJson = path.resolve(__dirname, '../', '.cprc.json');
  return fs.existsSync(cprcJson) ? require(cprcJson).version : { version: 'unknown' };
}

export function hasReadme(srcDir: string) {
  return fs.existsSync(path.resolve(process.cwd(), srcDir, 'README.md'));
}

// Support bundling nested plugins by finding all plugin.json files in src directory
// then checking for a sibling module.[jt]sx? file.
export async function getEntries(): Promise<Record<string, string>> {
  const pluginsJson = await glob('**/src/**/plugin.json', { absolute: true });

  const plugins = await Promise.all(
    pluginsJson.map((pluginJson) => {
      const folder = path.dirname(pluginJson);
      return glob(`${folder}/module.{ts,tsx,js,jsx}`, { absolute: true });
    })
  );

  return plugins.reduce((result, modules) => {
    return modules.reduce((result, module) => {
      const entryName = 'module';

      result[entryName] = module;
      return result;
    }, result);
  }, {});
}
