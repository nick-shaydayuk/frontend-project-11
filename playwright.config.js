// @ts-check
/* eslint-disable no-useless-escape */

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  // testIgnore: '**/**\.test\.js',
  workers: 1,
  maxFailures: 1,
  testDir: './__tests__',
  outputDir: './tmp/artifacts',
  use: {
    baseURL: 'http://localhost:8080',
    browserName: 'chromium',
    headless: true,
    screenshot: 'only-on-failure',
    viewport: { width: 1600, height: 900 },
    locale: 'ru-RU',
  },
  webServer: {
    command: 'npx webpack serve --port 8080 --host 0.0.0.0',
    url: 'http://localhost:8080',
  },
};

export default config;
