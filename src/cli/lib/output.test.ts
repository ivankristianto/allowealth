import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test';
import { createOutput } from './output';

describe('createOutput', () => {
  let logSpy: ReturnType<typeof spyOn<typeof console, 'log'>>;

  beforeEach(() => {
    logSpy = spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockReset();
  });

  it('writes human message by default', () => {
    const output = createOutput({});

    output.write({ ok: true }, 'done');

    expect(logSpy).toHaveBeenCalledWith('done');
  });

  it('writes json when json mode is enabled', () => {
    const output = createOutput({ json: true });

    output.write({ ok: true }, 'done');

    expect(logSpy).toHaveBeenCalledWith('{"ok":true}');
  });

  it('does not call human formatter callback in json mode', () => {
    const output = createOutput({ json: true });
    let formatterCalled = false;

    output.write({ ok: true }, () => {
      formatterCalled = true;
      return 'done';
    });

    expect(formatterCalled).toBeFalse();
    expect(logSpy).toHaveBeenCalledWith('{"ok":true}');
  });

  it('supports human formatter function', () => {
    const output = createOutput({});

    output.write({ count: 2 }, (value) => `count=${value.count}`);

    expect(logSpy).toHaveBeenCalledWith('count=2');
  });
});
