/* eslint-disable no-console -- CLI output is intentional */

export type OutputWriter = {
  json: boolean;
  write<T>(value: T, humanMessage: string | ((value: T) => string)): void;
};

export function createOutput(args: { json?: unknown }): OutputWriter {
  const json = args.json === true;

  return {
    json,
    write<T>(value: T, humanMessage: string | ((value: T) => string)) {
      if (json) {
        console.log(JSON.stringify(value));
        return;
      }

      if (typeof humanMessage === 'function') {
        console.log(humanMessage(value));
        return;
      }

      console.log(humanMessage);
    },
  };
}
