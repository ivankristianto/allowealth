export default {
  ignoreFiles: [
    'dist/**',
    '**/dist/**',
    '**/*.astro',
    'node_modules/**',
    'storybook-static/**',
    'e2e/playwright-report/**',
    'test-results/**',
  ],
  extends: ['stylelint-config-standard', 'stylelint-config-recommended'],
  rules: {
    // Allow Tailwind CSS imports
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: [
          'tailwind',
          'apply',
          'layer',
          'import',
          'theme',
          'source',
          'plugin',
          'property', // CSS Houdini @property for DaisyUI v5 radial progress animations
        ],
      },
    ],
    // Allow custom class names
    'selector-class-pattern': null,
    // Allow custom property names (CSS variables)
    'custom-property-pattern': null,
    // Allow descending specificity for utility classes
    'no-descending-specificity': null,
    // Allow longer hex colors
    'color-hex-length': null,
    // Allow case variations in font names
    'value-keyword-case': null,
    // Allow decimal alpha values
    'alpha-value-notation': null,
    // Allow import without url()
    'import-notation': null,
    // Allow comment without empty line before
    'comment-empty-line-before': null,
  },
};
