/**
 * Prettier Configuration
 * 
 * This configuration ensures consistent code formatting
 * across the entire application.
 */
module.exports = {
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',
  jsxSingleQuote: false,
  trailingComma: 'es5',
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'avoid',
  endOfLine: 'lf',
  
  // Configuration for specific file types
  overrides: [
    {
      files: '*.{json,yml,yaml,md}',
      options: {
        tabWidth: 2,
      },
    },
  ],
};