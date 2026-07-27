import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const releaseTypes = new Set(['major', 'minor', 'patch']);

type CommandRunner = (command: string, args: string[]) => string;

interface ReleaseOptions {
	releaseType: string | undefined;
	runCommand: CommandRunner;
}

interface CommandEnvironment {
	platform: NodeJS.Platform;
	nodePath: string;
	npmPath: string | undefined;
}

interface CommandInvocation {
	executable: string;
	args: string[];
}

export const resolveCommand = (
	command: string,
	args: string[],
	environment: CommandEnvironment
): CommandInvocation => {
	if (command !== 'npm' || environment.platform !== 'win32') {
		return { executable: command, args };
	}

	if (!environment.npmPath) {
		throw new Error('Unable to locate the npm CLI');
	}

	// running the npm JavaScript entrypoint avoids Windows command shim errors
	return {
		executable: environment.nodePath,
		args: [environment.npmPath, ...args]
	};
};

export const runRelease = ({ releaseType, runCommand }: ReleaseOptions) => {
	if (!releaseType || !releaseTypes.has(releaseType)) {
		throw new Error('Release type must be major, minor, or patch');
	}

	const branch = runCommand('git', ['branch', '--show-current']).trim();

	if (branch !== 'main') {
		throw new Error('Releases can only be created from main');
	}

	// untracked local files should not prevent an otherwise reproducible release
	const trackedChanges = runCommand('git', ['status', '--short', '--untracked-files=no']).trim();

	if (trackedChanges) {
		throw new Error('Commit or discard tracked changes before releasing');
	}

	runCommand('npm', ['run', 'check']);
	runCommand('npm', ['test']);
	runCommand('npm', ['version', releaseType, '-m', 'chore(release): v%s']);
	runCommand('git', ['push', 'origin', 'main', '--follow-tags']);
	runCommand('npm', ['run', 'deploy:site']);
};

const runCommand: CommandRunner = (command, args) => {
	const invocation = resolveCommand(command, args, {
		platform: process.platform,
		nodePath: process.execPath,
		npmPath: process.env.npm_execpath
	});
	const result = spawnSync(invocation.executable, invocation.args, {
		encoding: 'utf8',
		stdio: ['inherit', 'pipe', 'pipe']
	});

	if (result.stdout) {
		process.stdout.write(result.stdout);
	}

	if (result.stderr) {
		process.stderr.write(result.stderr);
	}

	if (result.error) {
		throw result.error;
	}

	if (result.status !== 0) {
		throw new Error(`${command} ${args.join(' ')} failed`);
	}

	return result.stdout ?? '';
};

const scriptPath = process.argv[1];
const isDirectRun = scriptPath && resolve(scriptPath) === fileURLToPath(import.meta.url);

if (isDirectRun) {
	try {
		runRelease({ releaseType: process.argv[2], runCommand });
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`Release failed: ${message}`);
		process.exitCode = 1;
	}
}
