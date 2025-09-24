const packager = require('electron-packager');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

packager({
    name: 'honeycomb-app',
    dir: path.resolve(__dirname, '..'),
    overwrite: true,
    out: 'builds',
    extraResource: '../../assets/models/m2020/',
    afterCopy: [
        (buildPath, electronVersion, platform, arch, callback) => {

            // electron packager doesn't work nice with yarn workspaces so run
            // a production install after copying all the files.
            // https://github.com/electron/electron-packager/issues/774#issuecomment-354694049
            console.log('executing yarn install in');
            console.log(buildPath);

            // remove the dev dependencies because even with production = true
            // yarn still seems to try to find some of the dev dependencies including
            // the honeycomb packages and fails.
            const packagejsonPath = path.join(buildPath, 'package.json');
            const packagejson = require(packagejsonPath);
            delete packagejson.devDependencies;
            fs.writeFileSync(
                packagejsonPath,
                JSON.stringify(packagejson, null, 2),
                { encoding: 'utf8' },
            );

            exec(
                'rm -rf ./node_modules',
                ( error, stdout, stderr ) => {
                    console.error(error);
                    console.log(stdout);
                    console.error(stderr);
                }
            );

            exec(
                'yarn install --production=true\n',
                {
                    cwd: buildPath,
                },
                ( error, stdout, stderr ) => {
                    console.error( error );
                    console.log( stdout );
                    console.error( stderr );

                    callback();
                },
            );
        },
    ],
});
