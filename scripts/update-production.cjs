// Deliberately publish Android JS/assets to the everyday app. No shell interpolation.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
process.chdir(root);
const args = process.argv.slice(2);
const dryRun = args[0] === '--dry-run';
if (dryRun) args.shift();
if (args.length !== 4 || args[0] !== '--build' || !/^[a-f0-9-]{36}$/.test(args[1])
  || args[2] !== '--message' || !args[3].trim()) {
  throw new Error('Usage: npm exec --package=eas-cli@27.5.0 -- node scripts/update-production.cjs [--dry-run] --build APK_BUILD_ID --message "Describe the release"');
}
const buildId = args[1];
process.env.APP_VARIANT = 'production';
delete process.env.EAS_BUILD_PROFILE;
const config = require('../app.config')({ config: require('../app.json').expo });
if (config.android.package !== 'io.github.haan.grocerylist' || config.extra.appVariant !== 'production') {
  throw new Error('Expected the everyday Android configuration');
}
const cliPrefix = ['exec', '--yes', '--package=eas-cli@27.5.0', '--', 'eas'];
const cliArgs = ['update',
  '--platform', 'android', '--channel', 'production', '--environment', 'production',
  '--message', args[3], '--non-interactive', '--emit-metadata'];
if (dryRun) {
  console.log(JSON.stringify({ package: config.android.package, variant: process.env.APP_VARIANT, buildId, args: cliArgs }, null, 2));
} else {
  if (!process.env.npm_execpath) throw new Error('Run this command through npm exec --package=eas-cli@27.5.0 -- node scripts/update-production.cjs');
  const readEas = command => {
    const result = spawnSync(process.execPath, [process.env.npm_execpath, ...cliPrefix, ...command], {
      cwd: root, env: process.env, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`EAS preflight failed: ${result.stderr}`);
    // EAS may print a loaded-environment notice before its JSON object.
    return JSON.parse(result.stdout.slice(result.stdout.indexOf('{')));
  };
  const build = readEas(['build:view', buildId, '--json']);
  if (build.status !== 'FINISHED' || build.appIdentifier !== config.android.package || build.buildProfile !== 'production') {
    throw new Error('Choose a finished everyday production APK build');
  }
  const comparison = readEas(['fingerprint:compare', '--build-id', buildId, '--environment', 'production', '--json', '--non-interactive']);
  if (comparison.fingerprint1.hash !== build.runtime?.version || comparison.fingerprint2.hash !== build.runtime?.version) {
    throw new Error('Runtime fingerprint differs from the selected APK. Review the native/tooling differences; do not override the runtime to force delivery.');
  }
  console.log(`Compatible with everyday APK ${build.appVersion} (${build.appBuildVersion}); publishing to production.`);
  const result = spawnSync(process.execPath, [process.env.npm_execpath, ...cliPrefix, ...cliArgs], {
    cwd: root, env: process.env, stdio: 'inherit',
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}
