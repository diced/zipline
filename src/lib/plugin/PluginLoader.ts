import { FastifyInstance } from "fastify";
import { readdirSync, statSync } from "fs";
import { join } from "path";
import { Plugin } from "./Plugin";

export class PluginLoader {
  public directory: string;
  public files: string[];
  public plugins: Plugin[] = [];
  public builtIns: Plugin[] = [];
  public fastify: FastifyInstance;

  constructor(fastify: FastifyInstance, ...directory: string[]) {
    this.directory = join(...directory);
    this.fastify = fastify;
  }

  public getAllFiles(builtIn: boolean = false): string[] {
    const result = [];

    const r = (dir: string) => {
      for (const file of readdirSync(dir)) {
        const p = join(dir, file);
        const s = statSync(p);
        if (s.isDirectory()) r(p);
        else result.push(p);
      }
    };

    r(builtIn ? join(process.cwd(), process.env.NODE_ENV == 'development' ? 'dist/src' : 'src', 'lib', 'plugin', 'builtins') : this.directory);

    return result;
  }

  public async loadPlugins(builtIn: boolean = false): Promise<Plugin[]> {
    const files = this.getAllFiles(builtIn);

    for (const pluginFile of files) {
      const im = await import(pluginFile);
      builtIn ? this.builtIns.push(new im.default()) : this.plugins.push(new im.default());
    }

    return builtIn ? this.builtIns.sort((a, b) => a.priority - b.priority) : this.plugins.sort((a, b) => a.priority - b.priority);
  }
}