function isSafeColor(value: string): boolean {
  if (/^#[\da-f]{6}$/i.test(value)) return true;
  const rgb = value.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
  return Boolean(rgb && rgb.slice(1).every((channel) => Number(channel) <= 255));
}

function serializeSafeNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    const span = document.createElement('span');
    span.textContent = node.textContent ?? '';
    return span.innerHTML;
  }
  if (!(node instanceof HTMLElement)) return '';

  const tag = node.tagName.toLowerCase();
  if (['script', 'style', 'iframe', 'object', 'svg', 'math'].includes(tag)) return '';

  const harmonyUrl = node.getAttribute('data-ritual-harmony');
  if (tag === 'span' && harmonyUrl && /^(https?:\/\/|spotify:)/i.test(harmonyUrl)) {
    const harmonyName = (node.getAttribute('data-ritual-harmony-name') || 'Harmonia').slice(0, 200);
    const buttonLabel = (node.getAttribute('data-ritual-harmony-label') || '').trim().slice(0, 40);
    const marker = document.createElement('span');
    marker.className = 'ritual-harmony-marker';
    marker.setAttribute('role', 'button');
    marker.setAttribute('tabindex', '0');
    marker.setAttribute('contenteditable', 'false');
    marker.setAttribute('data-ritual-harmony', harmonyUrl);
    marker.setAttribute('data-ritual-harmony-name', harmonyName);
    if (buttonLabel) marker.setAttribute('data-ritual-harmony-label', buttonLabel);
    const markerId = node.getAttribute('data-ritual-harmony-id');
    if (markerId && /^[\w-]{1,100}$/.test(markerId)) {
      marker.setAttribute('data-ritual-harmony-id', markerId);
    }
    marker.setAttribute('title', `Reproduzir ${buttonLabel || harmonyName}`);
    marker.textContent = buttonLabel ? `${buttonLabel} ▶` : '▶';
    return marker.outerHTML;
  }

  const content = Array.from(node.childNodes, serializeSafeNode).join('');
  if (tag === 'br') return '<br>';
  if (['b', 'strong', 'u', 'p', 'div'].includes(tag)) return `<${tag}>${content}</${tag}>`;
  if (tag === 'font' || tag === 'span') {
    const color = tag === 'font' ? node.getAttribute('color') : node.style.color;
    if (color && isSafeColor(color)) return `<span style="color: ${color.toLowerCase()}">${content}</span>`;
    return content;
  }
  return content;
}

export function sanitizeRitualDetails(value: string): string {
  if (typeof DOMParser === 'undefined') return value;
  const documentValue = new DOMParser().parseFromString(value, 'text/html');
  return Array.from(documentValue.body.childNodes, serializeSafeNode).join('');
}
