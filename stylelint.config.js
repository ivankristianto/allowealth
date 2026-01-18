export default {
  ignoreFiles: ['dist/**', '**/*.astro'],
  extends: ['stylelint-config-standard', 'stylelint-config-recommended'],
  rules: {
    // Allow Tailwind CSS imports
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: ['tailwind', 'apply', 'layer', 'import', 'theme', 'source', 'plugin'],
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
