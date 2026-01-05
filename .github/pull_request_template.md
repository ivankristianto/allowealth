# Pull Request

## Summary

<!-- Provide a clear and concise description of what this PR does -->

## Type of Change

<!-- Mark the relevant option with an 'x' -->

- [ ] 🐛 Bug fix (non-breaking change that fixes an issue)
- [ ] ✨ New feature (non-breaking change that adds functionality)
- [ ] 💥 Breaking change (fix or feature that causes existing functionality to change)
- [ ] 📝 Documentation update
- [ ] ♻️ Code refactoring (no functional changes)
- [ ] 🎨 UI/UX improvement
- [ ] ⚡ Performance improvement
- [ ] 🧪 Test addition/update
- [ ] 🔧 Configuration change
- [ ] 🔒 Security fix

## Related Issues

<!-- Link to related issues using #issue_number or beads issue ID -->

Closes: <!-- beads-xxx or #123 -->
Related to: <!-- beads-yyy or #456 -->

## Changes Made

<!-- Provide a detailed list of changes -->

### Components Added/Modified

-

### Pages Added/Modified

-

### API/Backend Changes

-

### Database Changes

-

### Dependencies Added/Removed

-

## Quality Gates

<!-- All must pass before merge -->

- [ ] ✅ TypeScript compilation passes (`bun run typecheck`)
- [ ] ✅ ESLint passes with no errors (`bun run lint`)
- [ ] ✅ Prettier formatting applied (`bun run format:fix`)
- [ ] ✅ All tests pass (if applicable)
- [ ] ✅ No console errors in browser
- [ ] ✅ No console warnings in browser (or documented if necessary)

## Security Checklist

<!-- Mark N/A if not applicable -->

- [ ] Input validation implemented (client and server-side)
- [ ] XSS prevention measures in place
- [ ] CSRF protection implemented (for forms)
- [ ] SQL injection prevention (parameterized queries/ORM)
- [ ] Authentication/authorization properly implemented
- [ ] Sensitive data not exposed in logs/errors
- [ ] No hardcoded secrets or credentials
- [ ] N/A - No security-sensitive changes

## Accessibility Checklist

<!-- Mark N/A if not applicable -->

- [ ] Semantic HTML used
- [ ] ARIA labels added where needed
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG 2.1 AA standards
- [ ] Screen reader tested (or compatible markup used)
- [ ] N/A - No UI changes

## Test Plan

<!-- Describe how to test this PR -->

### Manual Testing Steps

1.
2.
3.

### Test Cases Covered

- [ ] Happy path works as expected
- [ ] Error states handled gracefully
- [ ] Edge cases considered
- [ ] Loading states implemented
- [ ] Form validation works correctly
- [ ] Mobile responsive (if UI changes)

### Browsers Tested

- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers (iOS/Android)

## Screenshots/Videos

<!-- Add screenshots or videos demonstrating the changes -->

### Before

<!-- If applicable -->

### After

<!-- If applicable -->

## Breaking Changes

<!-- List any breaking changes and migration steps -->

- [ ] No breaking changes
- [ ] Breaking changes documented below

<!-- If breaking changes, describe them here -->

## Rollback Plan

<!-- How to rollback if issues arise after deployment -->

## Additional Notes

<!-- Any additional context, concerns, or information -->

## Checklist

<!-- Final checklist before requesting review -->

- [ ] Code follows project style guidelines (CLAUDE.md)
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated (if needed)
- [ ] No unnecessary console.logs or debug code
- [ ] Storybook stories added (for new components)
- [ ] Commit messages are clear and follow conventions
- [ ] PR title is descriptive and follows convention (feat/fix/docs/etc)
- [ ] Ready for review

---

<!--
Tips for reviewers:
- Focus on logic, security, and maintainability
- Check for edge cases and error handling
- Verify accessibility and responsive design
- Ensure tests cover critical paths
-->
