import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import { accessSync, constants, statSync } from 'fs';
import { delimiter, join } from 'path';

let cachedFfmpeg: string | null;

function isExec(path: string): boolean {
  try {
    if (!statSync(path).isFile()) return false;
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export function findFfmpeg(): string | null {
  if (cachedFfmpeg !== undefined) return cachedFfmpeg;

  if (process.env.FFMPEG_PATH && isExec(process.env.FFMPEG_PATH)) {
    cachedFfmpeg = process.env.FFMPEG_PATH;
    return cachedFfmpeg;
  }

  const extensions =
    process.platform === 'win32' ? (process.env.PATHEXT || '.EXE;.CMD;.BAT;.COM').split(';') : [''];

  for (const dir of (process.env.PATH || '').split(delimiter)) {
    if (!dir) continue;

    for (const ext of extensions) {
      const candidate = join(dir, `ffmpeg${ext.toLowerCase()}`);
      if (isExec(candidate)) {
        cachedFfmpeg = candidate;
        return cachedFfmpeg;
      }
    }
  }

  cachedFfmpeg = null;
  return cachedFfmpeg;
}

export class FfmpegCommand extends EventEmitter {
  private input: string;
  private videoFilterList: string[] = [];
  private frameCount?: number;
  private outputPath?: string;

  constructor(input: string) {
    super();
    this.input = input;
  }

  public on(event: 'start', listener: (command: string) => void): this;
  public on(event: 'error', listener: (err: Error, stdout: string, stderr: string) => void): this;
  public on(event: 'end', listener: (stdout: string, stderr: string) => void): this;
  public on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  public videoFilters(...filters: string[]): this {
    this.videoFilterList.push(...filters);
    return this;
  }

  public frames(count: number): this {
    this.frameCount = count;
    return this;
  }

  public output(path: string): this {
    this.outputPath = path;
    return this;
  }

  private buildArgs(): string[] {
    const args = ['-hide_banner', '-i', this.input];

    if (this.videoFilterList.length) args.push('-filter:v', this.videoFilterList.join(','));
    if (this.frameCount !== undefined) args.push('-frames:v', String(this.frameCount));

    args.push('-y', this.outputPath!);

    return args;
  }

  public run(): void {
    if (!this.outputPath) {
      this.emit('error', new Error('no output file specified'), '', '');
      return;
    }

    const ffmpegPath = findFfmpeg();
    if (!ffmpegPath) {
      this.emit(
        'error',
        new Error('cannot find ffmpeg executable, set FFMPEG_PATH or add ffmpeg to your PATH'),
        '',
        '',
      );
      return;
    }

    const args = this.buildArgs();

    this.emit('start', [ffmpegPath, ...args].join(' '));

    const proc = spawn(ffmpegPath, args, { windowsHide: true });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => (stdout += chunk));
    proc.stderr.on('data', (chunk) => (stderr += chunk));

    proc.on('error', (err) => {
      this.emit('error', err, stdout, stderr);
    });

    proc.on('close', (code, signal) => {
      if (code === 0) {
        this.emit('end', stdout, stderr);
      } else if (signal) {
        this.emit('error', new Error(`ffmpeg was killed with signal ${signal}`), stdout, stderr);
      } else {
        const lastLine = stderr.trim().split('\n').pop() ?? '';
        this.emit('error', new Error(`ffmpeg exited with code ${code}: ${lastLine}`), stdout, stderr);
      }
    });
  }
}

export default function ffmpeg(input: string): FfmpegCommand {
  return new FfmpegCommand(input);
}
