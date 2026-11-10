export function getOwnedStorageObjectPath(
  publicUrl: string | null | undefined,
  bucket: string,
  ownerId: string | null | undefined,
): string | null {
  if (!publicUrl || !ownerId) return null;

  try {
    const pathname = new URL(publicUrl).pathname;
    const marker = `/storage/v1/object/public/${bucket}/`;
    const markerIndex = pathname.indexOf(marker);
    if (markerIndex === -1) return null;

    const path = decodeURIComponent(pathname.slice(markerIndex + marker.length));
    return path.startsWith(`${ownerId}/`) ? path : null;
  } catch {
    return null;
  }
}
