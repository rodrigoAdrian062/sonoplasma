// Busca o título de um link (YouTube/Spotify e outros suportados) via noembed.
export async function fetchLinkTitle(url: string): Promise<string | null> {
  try {
    const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
    if (!res.ok) {
      console.warn(`[fetchLinkTitle] noembed API returned status ${res.status} for ${url}`);
      return null;
    }
    const data = await res.json();
    if (data && typeof data.title === 'string') return data.title.trim();
    
    // Fallback based on URL type if title is missing
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const { getYouTubeVideoId } = await import('./embedUrl');
      const id = getYouTubeVideoId(url);
      return id ? `YouTube Video (${id})` : 'Vídeo do YouTube';
    }
    
    return null;
  } catch (err) {
    console.error(`[fetchLinkTitle] Error fetching title for ${url}:`, err);
    return null;
  }
}
