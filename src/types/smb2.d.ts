declare module 'smb2' {
  interface SMB2Options {
    share: string;
    domain: string;
    username: string;
    password: string;
    port?: number;
    packetConcurrency?: number;
    autoCloseTimeout?: number;
  }

  interface SMB2Stats {
    size: number;
    isDirectory: () => boolean;
    isFile: () => boolean;
  }

  class SMB2 {
    constructor(options: SMB2Options);

    readFile(path: string, callback: (err: any, data: Buffer) => void): void;
    readFile(
      path: string,
      options: { start: number; end: number },
      callback: (err: any, data: Buffer) => void,
    ): void;

    writeFile(path: string, data: Buffer, callback: (err: any) => void): void;

    unlink(path: string, callback: (err: any) => void): void;

    stat(path: string, callback: (err: any, stats: SMB2Stats) => void): void;

    exists(path: string, callback: (exists: boolean) => void): void;

    mkdir(path: string, callback: (err: any) => void): void;

    readdir(path: string, callback: (err: any, files: string[]) => void): void;

    close(): void;
  }

  export = SMB2;
}
