#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';

const CLI_PACKAGE = '@noodleseed/one@0.153.0';
const HOST = 'codex';
const compatibilityFile = resolve(dirname(fileURLToPath(import.meta.url)), '../../../noodle-plugin-compatibility.json');
const configHome = join(homedir(), '.noodle', 'plugin-profiles', HOST);
const env = {
  ...process.env,
  NOODLE_PLUGIN_HOST: 'codex',
  NOODLE_CONFIG_HOME: configHome,
  NOODLE_PLUGIN_COMPATIBILITY_FILE: compatibilityFile,
};
const argv = process.argv.slice(2);
const WINDOWS_DISCOVERY_COMMANDS = new Set(['--help', '-h', 'help', '--version', '-v', 'version']);
const NATIVE_WINDOWS_ERROR = {"code":"unsupported_platform","message":"Noodle CLI commands run on macOS or Windows through WSL2.","cause":"Native PowerShell, Command Prompt, and Git Bash are not supported.","fix":"Install WSL2 with Ubuntu and run Noodle from its Bash shell.","next":"wsl --install -d Ubuntu"};
function rejectUnsupportedNativeWindows(argv) {
  if (process.platform !== 'win32' || WINDOWS_DISCOVERY_COMMANDS.has(argv[0] ?? '')) return false;
  if (argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify({ ok: false, error: NATIVE_WINDOWS_ERROR })}\n`);
  } else {
    process.stderr.write(`${[
      `${NATIVE_WINDOWS_ERROR.code}: ${NATIVE_WINDOWS_ERROR.message}`,
      `Cause: ${NATIVE_WINDOWS_ERROR.cause}`,
      `Fix: ${NATIVE_WINDOWS_ERROR.fix}`,
      `Next: ${NATIVE_WINDOWS_ERROR.next}`,
    ].join('\n')}\n`);
  }
  process.exitCode = 2;
  return true;
}
const npmArgs = ['exec', '--yes', `--package=${CLI_PACKAGE}`, '--', 'noodle', ...argv];
const npmCli = join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
const command = process.platform === 'win32' ? process.execPath : 'npm';
const commandArgs = process.platform === 'win32' ? [npmCli, ...npmArgs] : npmArgs;
const STDERR_TAIL_LIMIT = 16 * 1024;
const BOOTSTRAP_FAILURE =
  /(?:npm (?:error|ERR!) (?:code )?(?:EAI_AGAIN|ENETUNREACH|ENOTFOUND|ECONNREFUSED|ETIMEDOUT)|No matching version found for @noodleseed\/one@|404 Not Found[^\n]*(?:@noodleseed(?:%2f|\/)one)|could not determine executable to run)/i;
let stderrTail = '';
let bootstrapFailureDetected = false;
let launchFailed = false;
function launchCli() {
const child = spawn(
  command,
  commandArgs,
  { stdio: ['inherit', 'inherit', 'pipe'], shell: false, env },
);
child.stderr.on('data', (chunk) => {
  const text = String(chunk);
  process.stderr.write(text);
  const combined = `${stderrTail}${text}`;
  bootstrapFailureDetected ||= BOOTSTRAP_FAILURE.test(combined);
  stderrTail = combined.slice(-STDERR_TAIL_LIMIT);
});
child.once('error', (error) => {
  launchFailed = true;
  process.stderr.write(`${JSON.stringify({ ok: false, error: { code: 'plugin_cli_launch_failed', message: error.message } })}\n`);
  process.exitCode = 1;
});
child.once('close', (code, signal) => {
  if (launchFailed) return;
  if (signal !== null) {
    process.kill(process.pid, signal);
    return;
  }
  if ((code ?? 1) !== 0 && bootstrapFailureDetected) {
    const recovery = {
      ok: false,
      error: {
        code: 'plugin_cli_bootstrap_failed',
        message: `The plugin could not start its pinned CLI package ${CLI_PACKAGE}.`,
        next: [
          'Check access to https://registry.npmjs.org and retry.',
          'Update or reinstall the Noodle Seed plugin from its marketplace.',
          `If it continues, verify npm can resolve ${CLI_PACKAGE}.`,
        ],
      },
    };
    process.stderr.write(`${JSON.stringify(recovery)}\n`);
  }
  process.exitCode = code ?? 1;
});
}
if (!rejectUnsupportedNativeWindows(argv)) launchCli();
