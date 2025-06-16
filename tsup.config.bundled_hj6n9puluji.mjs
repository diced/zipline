// tsup.config.ts
import glob from 'fast-glob';
import { defineConfig } from 'tsup';
import { replaceTscAliasPaths } from 'tsc-alias';
import { copyFile, mkdir } from 'fs/promises';
var tsup_config_default = defineConfig(async (_) => {
  return [
    {
      platform: 'node',
      format: 'cjs',
      clean: true,
      sourcemap: true,
      entry: await glob('./src/**/*.ts', {
        ignore: ['./src/components/**/*.ts', './src/pages/**/*.ts'],
      }),
      outDir: 'build',
      bundle: false,
      onSuccess: async () => {
        console.log('[ts] replacing ts paths...');
        await replaceTscAliasPaths({
          configFile: 'tsconfig.json',
          outDir: 'build',
        });
        console.log('[built-ins] copying builtins...');
        const builtins = await glob('./src/lib/theme/builtins/*.theme.json');
        await mkdir('./build/lib/theme/builtins', { recursive: true });
        for (const builtin of builtins) {
          await copyFile(builtin, builtin.replace('./src/', './build/'));
        }
      },
    },
  ];
});
export { tsup_config_default as default };
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidHN1cC5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9faW5qZWN0ZWRfZmlsZW5hbWVfXyA9IFwiQzpcXFxcVXNlcnNcXFxcZ29sZGJhbGxcXFxcRGVza3RvcFxcXFxHaXRodWJcXFxcemlwbGluZS1mb3JrXFxcXHRzdXAuY29uZmlnLnRzXCI7Y29uc3QgX19pbmplY3RlZF9kaXJuYW1lX18gPSBcIkM6XFxcXFVzZXJzXFxcXGdvbGRiYWxsXFxcXERlc2t0b3BcXFxcR2l0aHViXFxcXHppcGxpbmUtZm9ya1wiO2NvbnN0IF9faW5qZWN0ZWRfaW1wb3J0X21ldGFfdXJsX18gPSBcImZpbGU6Ly8vQzovVXNlcnMvZ29sZGJhbGwvRGVza3RvcC9HaXRodWIvemlwbGluZS1mb3JrL3RzdXAuY29uZmlnLnRzXCI7aW1wb3J0IGdsb2IgZnJvbSAnZmFzdC1nbG9iJztcclxuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndHN1cCc7XHJcbmltcG9ydCB7IHJlcGxhY2VUc2NBbGlhc1BhdGhzIH0gZnJvbSAndHNjLWFsaWFzJztcclxuaW1wb3J0IHsgY29weUZpbGUsIG1rZGlyIH0gZnJvbSAnZnMvcHJvbWlzZXMnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKGFzeW5jIChfKSA9PiB7XHJcbiAgcmV0dXJuIFtcclxuICAgIHtcclxuICAgICAgcGxhdGZvcm06ICdub2RlJyxcclxuICAgICAgZm9ybWF0OiAnY2pzJyxcclxuICAgICAgY2xlYW46IHRydWUsXHJcbiAgICAgIHNvdXJjZW1hcDogdHJ1ZSxcclxuICAgICAgZW50cnk6IGF3YWl0IGdsb2IoJy4vc3JjLyoqLyoudHMnLCB7XHJcbiAgICAgICAgaWdub3JlOiBbJy4vc3JjL2NvbXBvbmVudHMvKiovKi50cycsICcuL3NyYy9wYWdlcy8qKi8qLnRzJ10sXHJcbiAgICAgIH0pLFxyXG4gICAgICBvdXREaXI6ICdidWlsZCcsXHJcbiAgICAgIGJ1bmRsZTogZmFsc2UsXHJcbiAgICAgIG9uU3VjY2VzczogYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdbdHNdIHJlcGxhY2luZyB0cyBwYXRocy4uLicpO1xyXG4gICAgICAgIGF3YWl0IHJlcGxhY2VUc2NBbGlhc1BhdGhzKHtcclxuICAgICAgICAgIGNvbmZpZ0ZpbGU6ICd0c2NvbmZpZy5qc29uJyxcclxuICAgICAgICAgIG91dERpcjogJ2J1aWxkJyxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY29uc29sZS5sb2coJ1tidWlsdC1pbnNdIGNvcHlpbmcgYnVpbHRpbnMuLi4nKTtcclxuICAgICAgICBjb25zdCBidWlsdGlucyA9IGF3YWl0IGdsb2IoJy4vc3JjL2xpYi90aGVtZS9idWlsdGlucy8qLnRoZW1lLmpzb24nKTtcclxuXHJcbiAgICAgICAgYXdhaXQgbWtkaXIoJy4vYnVpbGQvbGliL3RoZW1lL2J1aWx0aW5zJywgeyByZWN1cnNpdmU6IHRydWUgfSk7XHJcbiAgICAgICAgZm9yIChjb25zdCBidWlsdGluIG9mIGJ1aWx0aW5zKSB7XHJcbiAgICAgICAgICBhd2FpdCBjb3B5RmlsZShidWlsdGluLCBidWlsdGluLnJlcGxhY2UoJy4vc3JjLycsICcuL2J1aWxkLycpKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gIF07XHJcbn0pO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQWlTLE9BQU8sVUFBVTtBQUNsVCxTQUFTLG9CQUFvQjtBQUM3QixTQUFTLDRCQUE0QjtBQUNyQyxTQUFTLFVBQVUsYUFBYTtBQUVoQyxJQUFPLHNCQUFRLGFBQWEsT0FBTyxNQUFNO0FBQ3ZDLFNBQU87QUFBQSxJQUNMO0FBQUEsTUFDRSxVQUFVO0FBQUEsTUFDVixRQUFRO0FBQUEsTUFDUixPQUFPO0FBQUEsTUFDUCxXQUFXO0FBQUEsTUFDWCxPQUFPLE1BQU0sS0FBSyxpQkFBaUI7QUFBQSxRQUNqQyxRQUFRLENBQUMsNEJBQTRCLHFCQUFxQjtBQUFBLE1BQzVELENBQUM7QUFBQSxNQUNELFFBQVE7QUFBQSxNQUNSLFFBQVE7QUFBQSxNQUNSLFdBQVcsWUFBWTtBQUNyQixnQkFBUSxJQUFJLDRCQUE0QjtBQUN4QyxjQUFNLHFCQUFxQjtBQUFBLFVBQ3pCLFlBQVk7QUFBQSxVQUNaLFFBQVE7QUFBQSxRQUNWLENBQUM7QUFFRCxnQkFBUSxJQUFJLGlDQUFpQztBQUM3QyxjQUFNLFdBQVcsTUFBTSxLQUFLLHVDQUF1QztBQUVuRSxjQUFNLE1BQU0sOEJBQThCLEVBQUUsV0FBVyxLQUFLLENBQUM7QUFDN0QsbUJBQVcsV0FBVyxVQUFVO0FBQzlCLGdCQUFNLFNBQVMsU0FBUyxRQUFRLFFBQVEsVUFBVSxVQUFVLENBQUM7QUFBQSxRQUMvRDtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
