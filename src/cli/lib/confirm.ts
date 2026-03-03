import * as readline from 'node:readline';

export type ConfirmOptions = {
  yes?: unknown;
  prompt?: string;
  expected?: string;
  ask?: (prompt: string) => Promise<string>;
  isConfirmationAvailable?: () => boolean;
};

function defaultAsk(prompt: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

const DEFAULT_PROMPT = 'Type "DELETE" to confirm: ';
const DEFAULT_EXPECTED = 'DELETE';

export async function requireDestructiveConfirmation(options: ConfirmOptions = {}): Promise<void> {
  if (options.yes === true) {
    return;
  }

  const isAvailable =
    options.isConfirmationAvailable ?? (() => Boolean(process.stdin.isTTY && process.stdout.isTTY));

  if (!isAvailable()) {
    throw new Error('Confirmation is required but unavailable. Re-run with --yes to bypass.');
  }

  const ask = options.ask ?? defaultAsk;
  const answer = await ask(options.prompt ?? DEFAULT_PROMPT);

  if (answer.trim() !== (options.expected ?? DEFAULT_EXPECTED)) {
    throw new Error('Confirmation declined.');
  }
}
