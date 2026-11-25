import { defineConfig } from '@playwright/test';

const deployedBaseURL=process.env.PLAYWRIGHT_TEST_BASE_URL;
const localPort = Number(process.env.PLAYWRIGHT_LOCAL_PORT ?? 4273);
if (!Number.isInteger(localPort) || localPort < 1024 || localPort > 65535) throw new Error('Invalid local E2E port');
const localBaseURL = `http://127.0.0.1:${localPort}/`;
if(deployedBaseURL){
  const url=new URL(deployedBaseURL);
  if(url.protocol!=='https:'||!url.pathname.endsWith('/'))throw new Error('Deployed E2E requires an HTTPS base URL ending in /');
}

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'],['html',{outputFolder:'assets/generated/e2e-report',open:'never'}]],
  outputDir: 'assets/generated/e2e-results',
  use: {
    baseURL:deployedBaseURL??localBaseURL,
    browserName:'chromium',
    headless:true,
    viewport:{width:1280,height:900},
    acceptDownloads:true,
    screenshot:'only-on-failure',
    trace:'retain-on-failure',
  },
  // Separate port and isolated contexts preserve the user's 4173 preview and saves.
  webServer: deployedBaseURL?undefined:{
    command:`node apps/web/node_modules/vite/bin/vite.js preview apps/web --host 127.0.0.1 --port ${localPort} --strictPort`,
    url:localBaseURL,
    reuseExistingServer:false,
    timeout:30_000,
  },
});
