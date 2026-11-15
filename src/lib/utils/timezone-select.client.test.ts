import { describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { selectTimeZoneOption } from './timezone-select.client';

function zoneSelect(zones: string[]): HTMLSelectElement {
  const document = new Window().document;
  const select = document.createElement('select');
  for (const zone of zones) {
    const option = document.createElement('option');
    option.value = zone;
    select.append(option);
  }
  return select as unknown as HTMLSelectElement;
}

describe('selectTimeZoneOption', () => {
  test('selects a zone the list already has', () => {
    const select = zoneSelect(['UTC', 'Asia/Jakarta']);

    selectTimeZoneOption(select, 'Asia/Jakarta');

    expect(select.value).toBe('Asia/Jakarta');
    expect(select.options).toHaveLength(2);
  });

  test('adds and selects a zone the list spells differently', () => {
    const select = zoneSelect(['UTC', 'Asia/Calcutta']);

    selectTimeZoneOption(select, 'Asia/Kolkata');

    expect(select.value).toBe('Asia/Kolkata');
    expect(select.options[0]?.textContent).toBe('Asia/Kolkata');
  });
});
