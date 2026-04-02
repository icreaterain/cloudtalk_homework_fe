module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'refactor', 'test', 'docs', 'chore', 'perf'],
    ],
    'scope-enum': [
      2,
      'always',
      ['auth', 'reviews', 'products', 'shared', 'graphql', 'fe'],
    ],
    'subject-case': [2, 'always', 'lower-case'],
  },
};
