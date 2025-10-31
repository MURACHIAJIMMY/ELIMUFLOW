const { install } = require('@puppeteer/browsers');

install({
  browser: 'chrome',
  buildId: '112.0.5615.121', // fallback stable version
  cacheDir: './.chrome-cache',
}).then(() => {
  console.log('✅ Chrome installed manually');
});
