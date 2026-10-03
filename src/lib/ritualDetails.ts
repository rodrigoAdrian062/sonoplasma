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
