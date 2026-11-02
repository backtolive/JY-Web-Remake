import { defineConfig } from '@playwright/test';

const deployedBaseURL=process.env.PLAYWRIGHT_TEST_BASE_URL;
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
    baseURL:deployedBaseURL??'http://127.0.0.1:4273/',
    browserName:'chromium',
    headless:true,
    viewport:{width:1280,height:900},
    acceptDownloads:true,
    screenshot:'only-on-failure',
    trace:'retain-on-failure',
  },
  // Separate port and isolated contexts preserve the user's 4173 preview and saves.
  webServer: deployedBaseURL?undefined:{
    command:'node apps/web/node_modules/vite/bin/vite.js preview apps/web --host 127.0.0.1 --port 4273 --strictPort',
    url:'http://127.0.0.1:4273/',
    reuseExistingServer:false,
    timeout:30_000,
  },
});
