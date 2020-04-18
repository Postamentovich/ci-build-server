module.exports = {
  env: {
    commonjs: true,
    es6: true,
    node: true,
  },
  extends: 'google',
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 2018,
  },
  rules: {
    'linebreak-style': ['error', 'windows'],
    'object-curly-spacing': 'off',
    'require-jsdoc': 'off',
    indent: 'off',
    'max-len': 'off',
  },
};
