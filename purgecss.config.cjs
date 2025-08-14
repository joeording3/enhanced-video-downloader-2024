module.exports = {
  content: [
    'extension/ui/*.html',
    'extension/src/**/*.ts',
    'extension/src/**/*.js',
  ],
  css: ['extension/ui/*.css'],
  defaultExtractor: content => content.match(/[A-Za-z0-9-_:./]+/g) || [],
  // Use regex-based safelist to preserve descendant selectors
  safelist: [
    /unified-list/, /unified-item/,
    /status-icon/, /item-title/, /item-percent/, /status-pill/,
    /cancel-button/, /retry-button/, /pause-button/, /resume-button/,
    /^status-[a-z-]+$/,
    /download-status/, /download-history/,
  ],
  output: 'extension/ui/optimized/',
};
