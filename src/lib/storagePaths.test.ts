import { describe, expect, it } from 'vitest';
import { getOwnedStorageObjectPath } from './storagePaths';

describe('getOwnedStorageObjectPath', () => {
  it('returns an object path owned by the current user', () => {
    expect(getOwnedStorageObjectPath(
      'https://example.supabase.co/storage/v1/object/public/logos/user-1/logo.png',
      'logos',
      'user-1',
    )).toBe('user-1/logo.png');
  });

  it('does not allow deleting another user or legacy shared assets', () => {
    expect(getOwnedStorageObjectPath(
      'https://example.supabase.co/storage/v1/object/public/logos/user-2/logo.png',
      'logos',
      'user-1',
    )).toBeNull();
    expect(getOwnedStorageObjectPath(
      'https://example.supabase.co/storage/v1/object/public/logos/publico/logo.png',
      'logos',
      'user-1',
    )).toBeNull();
  });

  it('returns null for URLs outside the requested bucket', () => {
    expect(getOwnedStorageObjectPath(
      'https://example.supabase.co/storage/v1/object/public/stage-icons/user-1/icon.jpg',
      'logos',
      'user-1',
    )).toBeNull();
  });
});
