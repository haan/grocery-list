// Guard the supported app targets and native integrations without building an APK.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const { expo } = JSON.parse(read('app.json'));
const pkg = JSON.parse(read('package.json'));
assert.deepEqual(expo.platforms, ['android'], 'The app supports Android only');
assert.equal(expo.ios, undefined, 'Remove the Apple app configuration');
assert.equal(expo.web, undefined, 'Remove the web app configuration');
assert.equal(expo.android.package, 'io.github.haan.grocerylist.dev');
assert.equal(expo.extra.eas.projectId, '80882728-1f01-40c5-b4aa-56fcfa53f928');
for (const [name, command] of Object.entries(pkg.scripts)) {
  assert(!/^(ios|web)$/.test(name) && !/run:ios|--platform\s+ios|start\s+--web/.test(command), `Unsupported script: ${name}`);
}
for (const plugin of expo.plugins) {
  const name = Array.isArray(plugin) ? plugin[0] : plugin;
  assert(!/siri|expo-iap|expo-mail-composer/i.test(name), `Removed integration: ${name}`);
}
for (const name of ['expo-iap', 'expo-store-review', 'expo-mail-composer', 'react-native-web', 'react-dom']) {
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
