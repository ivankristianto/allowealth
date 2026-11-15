/** Selects `zone`, first adding it if the server spells it differently (Kolkata vs Calcutta). */
export function selectTimeZoneOption(select: HTMLSelectElement, zone: string): void {
  if (!Array.from(select.options).some((option) => option.value === zone)) {
    const option = select.ownerDocument.createElement('option');
    option.value = zone;
    option.textContent = zone.replaceAll('_', ' ');
    select.prepend(option);
  }
  select.value = zone;
}
