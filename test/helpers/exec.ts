import childProcess from 'child_process';
import spawn from 'cross-spawn';
import util from 'util';

export default function(
    command: string,
    args?: ReadonlyArray<string>,
    options?: childProcess.SpawnOptions,
): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
        const process = spawn(command, args && [...args], options);
        const stdoutList: unknown[] = [];
        const stderrList: unknown[] = [];

        if (process.stdout) {
            process.stdout.on('data', chunk => {
                stdoutList.push(chunk);
            });
        }

        if (process.stderr) {
            process.stderr.on('data', chunk => {
                stderrList.push(chunk);
            });
        }

        process.on('close', (code, signal) => {
            const stdout = stdoutList.join('');
            const stderr = stderrList.join('');

            if (code === 0) {
                resolve({ stdout, stderr });
            } else {
                const err = new Error(
                    [
                        `Command failed code=${util.inspect(
                            code,
                        )} signal=${util.inspect(signal)}`,
                        '',
                        'stdout:',
                        stdout.replace(/^/gm, 'o '),
                        '',
                        'stderr:',
                        stderr.replace(/^/gm, 'e '),
                    ].join('\n'),
                );
                Object.assign(err, {
                    name: 'CommandFailedError',
                    code,
                    signal,
                    cmd: [command, ...(args || [])],
                    options,
                    stdout,
                    stderr,
                });
                reject(err);
            }
        });

        process.on('error', err => {
            reject(err);
        });
    });
}
