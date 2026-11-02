import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const require=createRequire(import.meta.url);
const args=process.argv.slice(2);
const install=args[0]==='--install';
if(install&&args.slice(1).some(arg=>arg!=='--with-deps'))throw new Error('Install supports only --with-deps');
const result=spawnSync(process.execPath,[require.resolve('@playwright/test/cli'),
  ...(install?['install',...args.slice(1),'chromium']:['test',...args])],{
  cwd:project,stdio:'inherit',env:{...process.env,PLAYWRIGHT_BROWSERS_PATH:path.join(project,'assets/generated/playwright-browsers')},
});
if(result.error){console.error(result.error.message);process.exitCode=1;}
else process.exitCode=result.status??1;
