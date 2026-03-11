const URL_ATTR_NAMES = new Set(['href', 'src', 'action', 'formaction', 'poster', 'xlink:href']);

function isUnsafeUrlAttributeValue(value: string): boolean {
  const normalized = value.replace(/[\u0000-\u0020\u007f]+/g, '').toLowerCase();

  return (
    normalized.startsWith('javascript:') ||
    normalized.startsWith('vbscript:') ||
    normalized.startsWith('data:text/html') ||
    normalized.startsWith('data:application/xhtml+xml')
  );
}

function sanitizeElementAttributes(element: Element): void {
  for (const attribute of Array.from(element.attributes)) {
    const attributeName = attribute.name.toLowerCase();

    if (attributeName.startsWith('on') || attributeName === 'srcdoc') {
      element.removeAttribute(attribute.name);
      continue;
    }

    if (URL_ATTR_NAMES.has(attributeName) && isUnsafeUrlAttributeValue(attribute.value)) {
      element.removeAttribute(attribute.name);
    }
  }
}

export function sanitizeHtmlFragment(html: string): DocumentFragment {
  const parsed = new DOMParser().parseFromString(html, 'text/html');

  parsed.querySelectorAll('script').forEach((scriptNode) => scriptNode.remove());
  parsed.body.querySelectorAll('*').forEach((element) => sanitizeElementAttributes(element));

  const fragment = document.createDocumentFragment();
  while (parsed.body.firstChild) {
    fragment.append(parsed.body.firstChild);
  }

  return fragment;
}

export function replaceWithSanitizedHtml(target: ParentNode, html: string): void {
  target.replaceChildren(sanitizeHtmlFragment(html));
}

export function createSanitizedHtmlContainer(html: string): HTMLDivElement {
  const container = document.createElement('div');
  replaceWithSanitizedHtml(container, html);
  return container;
}
