const path = require('node:path');

module.exports = function minimalFormatter(results) {
  const lines = [];
  let errorCount = 0;
  let warningCount = 0;
  let fixableErrorCount = 0;
  let fixableWarningCount = 0;

  for (const result of results) {
    const filePath = path.relative(process.cwd(), result.filePath);

    for (const message of result.messages) {
      const line = message.line || 0;
      const column = message.column || 0;
      const severity = message.severity === 2 ? 'error' : 'warn';
      const rule = message.ruleId ? ` [${message.ruleId}]` : '';

      lines.push(`${filePath}:${line}:${column} ${severity} ${message.message}${rule}`);
    }

    errorCount += result.errorCount;
    warningCount += result.warningCount;
    fixableErrorCount += result.fixableErrorCount;
    fixableWarningCount += result.fixableWarningCount;
  }

  if (lines.length === 0) {
    return '';
  }

  lines.push('');
  lines.push(`${errorCount} error(s), ${warningCount} warning(s)`);

  const fixableTotal = fixableErrorCount + fixableWarningCount;
  if (fixableTotal > 0) {
    lines.push(
      `${fixableErrorCount} error(s) and ${fixableWarningCount} warning(s) potentially fixable with --fix`
    );
  }

  return lines.join('\n');
};
