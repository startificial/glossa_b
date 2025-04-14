/**
 * Babel Configuration for ES Modules
 * This config is specifically designed for use with Jest in an ES modules environment
 */
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    '@babel/preset-typescript',
    ['@babel/preset-react', { runtime: 'automatic' }]
  ],
  plugins: [
    '@babel/plugin-syntax-flow'
  ]
};