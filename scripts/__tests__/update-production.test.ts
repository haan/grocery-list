/** Publishing must fail closed before uploading to household installations. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const source = fs.readFileSync(path.join(__dirname, '../update-production.cjs'), 'utf8');
const buildId = '9b8210ac-c3d5-4c33-9966-dd09bada49ea';
function run(options: { wrongBuild?: boolean; mismatch?: boolean; dry?: boolean; extra?: string[] } = {}) {
  const spawn = jest.fn((_exe: string, args: string[]) => {
    if (args.includes('build:view')) return { status: 0, stdout: JSON.stringify({
      status: 'FINISHED', appIdentifier: options.wrongBuild ? 'io.github.haan.grocerylist.dev' : 'io.github.haan.grocerylist',
      buildProfile: 'production', runtime: { version: 'same' },
    }) };
    if (args.includes('fingerprint:compare')) return { status: 0, stdout: 'Loaded environment notice\n' + JSON.stringify({
      fingerprint1: { hash: 'same' }, fingerprint2: { hash: options.mismatch ? 'different' : 'same' },
    }) };
    return { status: 0 };
  });
  const env: Record<string, string> = { npm_execpath: '/npm-cli.js', APP_VARIANT: 'development' };
  const args = [...(options.dry ? ['--dry-run'] : []), '--build', buildId, '--message', 'Literal $HOME `text` & text', ...(options.extra ?? [])];
  let error: unknown;
  try {
    vm.runInNewContext(source, {
      __dirname: path.join(__dirname, '..'),
      process: { argv: ['node', 'script', ...args], chdir: jest.fn(), env, execPath: '/node' },
      console: { log: jest.fn() },
      require: (name: string) => name === 'node:child_process' ? { spawnSync: spawn }
        : name === '../app.config' ? () => ({ android: { package: 'io.github.haan.grocerylist' }, extra: { appVariant: env.APP_VARIANT } })
        : name === '../app.json' ? { expo: {} } : require(name),
    });
  } catch (e) { error = e; }
  return { spawn, error };
}

it('publishes only after matching the production binary, keeping the message as an argument', () => {
  const { spawn, error } = run();
  expect(error).toBeUndefined();
  expect(spawn).toHaveBeenCalledTimes(3);
  const call = spawn.mock.calls[2];
  expect(call[1]).toEqual(expect.arrayContaining(['update', '--platform', 'android', '--channel', 'production', '--environment', 'production', 'Literal $HOME `text` & text']));
});
it.each([{ wrongBuild: true }, { mismatch: true }])('does not publish incompatible targets: %j', options => {
  const { spawn, error } = run(options);
  expect(error).toBeTruthy();
  expect(spawn.mock.calls.some(([, args]) => args.includes('update'))).toBe(false);
});
it('dry-run performs no network operations', () => {
  const { spawn, error } = run({ dry: true });
  expect(error).toBeUndefined();
  expect(spawn).not.toHaveBeenCalled();
});
it('rejects extra flags rather than allowing a channel override', () => {
  const { spawn, error } = run({ extra: ['--channel', 'development'] });
  expect(error).toBeTruthy();
  expect(spawn).not.toHaveBeenCalled();
});
