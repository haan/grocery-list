// Guard the supported app targets and native integrations without building an APK.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const { expo } = JSON.parse(read('app.json'));
const pkg = JSON.parse(read('package.json'));
const eas = JSON.parse(read('eas.json'));
const resolveVariant = require('../app.config');
const savedVariant = process.env.APP_VARIANT;
const savedProfile = process.env.EAS_BUILD_PROFILE;
try {
  assert.deepEqual(Object.keys(eas.build).sort(), ['development', 'production']);
  for (const variant of ['development', 'production']) {
    process.env.APP_VARIANT = variant;
    process.env.EAS_BUILD_PROFILE = variant;
    const resolved = resolveVariant({ config: expo });
    const dev = variant === 'development';
    assert.equal(resolved.android.package, `io.github.haan.grocerylist${dev ? '.dev' : ''}`);
    assert.equal(resolved.scheme, `haan-grocerylist${dev ? '-dev' : ''}`);
    assert.equal(resolved.name, dev ? 'Grocery List Dev' : 'Grocery List');
    assert.equal(resolved.android.adaptiveIcon.backgroundColor, dev ? '#5B3A80' : '#05515F');
    assert.deepEqual(resolved.platforms, ['android']);
    assert.equal(resolved.ios, undefined);
    assert.equal(resolved.web, undefined);
    assert.equal(resolved.extra.eas.projectId, expo.extra.eas.projectId);
    assert.deepEqual(resolved.plugins.find(p => p[0] === 'expo-dev-client'), ['expo-dev-client', { addGeneratedScheme: false }]);
    const profile = eas.build[variant];
    assert.equal(profile.env.APP_VARIANT, variant);
    assert.equal(profile.channel, variant);
    assert.equal(profile.environment, variant);
    assert.equal(profile.android.buildType, 'apk');
    assert.equal(profile.distribution, 'internal');
    assert.equal(!!profile.developmentClient, dev);
    assert.equal(profile.autoIncrement, true);
  }
  process.env.APP_VARIANT = 'typo';
  assert.throws(() => resolveVariant({ config: expo }), /Unknown APP_VARIANT/);
  process.env.APP_VARIANT = 'development';
  assert.throws(() => resolveVariant({ config: expo }), /must match/);
  delete process.env.APP_VARIANT;
  delete process.env.EAS_BUILD_PROFILE;
  assert.equal(resolveVariant({ config: expo }).android.package, expo.android.package);
} finally {
  if (savedVariant === undefined) delete process.env.APP_VARIANT;
  else process.env.APP_VARIANT = savedVariant;
  if (savedProfile === undefined) delete process.env.EAS_BUILD_PROFILE;
  else process.env.EAS_BUILD_PROFILE = savedProfile;
}
assert.deepEqual(expo.platforms, ['android'], 'The app supports Android only');
assert.equal(expo.ios, undefined, 'Remove the Apple app configuration');
assert.equal(expo.web, undefined, 'Remove the web app configuration');
assert.equal(expo.android.package, 'io.github.haan.grocerylist.dev');
assert.equal(expo.extra.eas.projectId, '80882728-1f01-40c5-b4aa-56fcfa53f928');
const localization = expo.plugins.find(p => Array.isArray(p) && p[0] === 'expo-localization');
assert.deepEqual(localization?.[1]?.supportedLocales, { android: ['en', 'lb'] }, 'Declare only the actual translated Android languages');
assert(!expo.plugins.includes('./plugins/withAndroidLocaleConfig'), 'Do not restore the obsolete locale plugin');
for (const [name, command] of Object.entries(pkg.scripts)) {
  assert(!/^(ios|web)$/.test(name) && !/run:ios|--platform\s+ios|start\s+--web/.test(command), `Unsupported script: ${name}`);
}
for (const plugin of expo.plugins) {
  const name = Array.isArray(plugin) ? plugin[0] : plugin;
  assert(!/siri|expo-iap|expo-mail-composer|expo-sharing/i.test(name), `Removed integration: ${name}`);
}
for (const name of ['expo-iap', 'expo-store-review', 'expo-mail-composer', 'react-native-web', 'react-dom', 'expo-document-picker', 'expo-sharing']) {
  assert(!pkg.dependencies[name], `Unused direct dependency: ${name}`);
}
function files(dir) {
  return fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const p = path.join(dir, entry.name);
    return entry.isDirectory() ? files(p) : [p];
  }) : [];
}
for (const file of [...files(path.join(root, 'modules')), ...files(path.join(root, 'plugins'))]) {
  assert(!/siri|\.swift$|\.podspec$/i.test(file), `Unsupported native integration: ${file}`);
}
for (const file of [...files(path.join(root, 'src')), path.join(root, 'App.tsx')]) {
  assert(!/siri|\.ios\.[jt]sx?$/i.test(file), `Unsupported app source: ${file}`);
  if (/\.[jt]sx?$/.test(file)) {
    assert(!/(?:from\s*|require\s*\(\s*)['"][^'"]*siri/i.test(fs.readFileSync(file, 'utf8')), `Removed integration import: ${file}`);
  }
}
for (const file of files(path.join(root, '.github/workflows'))) {
  assert(!/macos-|xcrun|run:ios|--platform[ =]+ios/i.test(fs.readFileSync(file, 'utf8')), `Apple build workflow: ${file}`);
}
console.log('Android-only configuration checks passed.');
