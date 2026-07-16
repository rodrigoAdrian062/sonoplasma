// Busca o título de um link (YouTube/Spotify e outros suportados) via noembed.
export async function fetchLinkTitle(url: string): Promise<string | null> {
  try {
    const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data && typeof data.title === 'string') return data.title.trim();
    return null;
  } catch {
    return null;
  }
}
