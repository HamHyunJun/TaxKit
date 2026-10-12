import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
    '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
    'func-style': ['error', 'expression'],
    'vue/block-order': ['error', { order: ['template', 'script', 'style'] }],
  },
})
