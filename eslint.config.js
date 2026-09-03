import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist', 'src/utils/mapaCaldas.js'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Patrón de carga estándar (fetch al montar): el setState inicial en el
      // efecto es intencional y no provoca cascadas problemáticas aquí.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: ['gas/**/*.js', 'scripts/**/*.mjs'],
    languageOptions: {
      globals: { ...globals.node, ...globals.googleappsscript },
    },
    rules: {
      'no-unused-vars': 'off',
    },
  },
]
