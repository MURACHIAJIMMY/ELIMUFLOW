const { install } = require('@puppeteer/browsers');

(async () => {
  try {
    await install({
      browser: 'chrome',
      buildId: '142.0.7444.59',
      cacheDir: './.chrome-cache',
    });
    console.log('✅ Chrome manually installed');
  } catch (err) {
    console.error('❌ Chrome install failed:', err);
    process.exit(0); // Prevent build failure
  }
})();
