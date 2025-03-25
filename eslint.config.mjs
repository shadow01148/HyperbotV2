// @ts-check

import tseslint from 'typescript-eslint';

export default tseslint.config(
  tseslint.configs.stylistic,
  { ignores: ['**/*.js'] },
);