export function getCaptchaToken(form: HTMLFormElement): string {
  const elements = Array.from(
    (form as { elements?: Iterable<unknown> | ArrayLike<unknown> }).elements ?? []
  );

  for (const element of elements) {
    if (
      element &&
      typeof element === 'object' &&
      'name' in element &&
      element.name === 'cf-turnstile-response' &&
      'value' in element &&
      typeof element.value === 'string'
    ) {
      return element.value.trim();
    }
  }

  return '';
}

export function hasCaptchaWidget(
  form: HTMLFormElement | { querySelector?: (selector: string) => unknown }
): boolean {
  return Boolean(form.querySelector?.('.cf-turnstile'));
}

export function buildCaptchaHeaders(form: HTMLFormElement): Record<string, string> {
  const token = getCaptchaToken(form);

  if (!token) {
    return {};
  }

  return {
    'x-captcha-response': token,
  };
}

export function resetCaptchaWidget(): void {
  if (typeof turnstile !== 'undefined') {
    turnstile.reset();
  }
}
