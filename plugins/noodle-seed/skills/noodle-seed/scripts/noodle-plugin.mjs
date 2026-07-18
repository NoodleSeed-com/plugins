#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';

const CLI_PACKAGE = '@noodleseed/one@0.59.0';
const HOST = 'codex';
const compatibilityFile = resolve(dirname(fileURLToPath(import.meta.url)), '../../../noodle-plugin-compatibility.json');
const configHome = join(homedir(), '.noodle', 'plugin-profiles', HOST);
const env = {
  ...process.env,
  NOODLE_PLUGIN_HOST: 'codex',
  NOODLE_CONFIG_HOME: configHome,
  NOODLE_PLUGIN_COMPATIBILITY_FILE: compatibilityFile,
};
const npmArgs = ['exec', '--yes', `--package=${CLI_PACKAGE}`, '--', 'noodle', ...process.argv.slice(2)];
const npmCli = join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
const command = process.platform === 'win32' ? process.execPath : 'npm';
const commandArgs = process.platform === 'win32' ? [npmCli, ...npmArgs] : npmArgs;
const child = spawn(
  command,
  commandArgs,
  { stdio: 'inherit', shell: false, env },
);
child.once('error', (error) => {
  process.stderr.write(`${JSON.stringify({ ok: false, error: { code: 'plugin_cli_launch_failed', message: error.message } })}\n`);
  process.exitCode = 1;
});
child.once('close', (code, signal) => {
  if (signal !== null) {
    process.kill(process.pid, signal);
    return;
  }
  process.exitCode = code ?? 1;
});
