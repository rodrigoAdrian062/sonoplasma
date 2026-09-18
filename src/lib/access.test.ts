import { describe, it, expect } from 'vitest';
import {
  ACCESS_PERMISSION_KEYS,
  buildPermissions,
  getAccessPlanConfig,
  hasPermission,
  normalizePermissions,
} from './access';

describe('access permissions', () => {
  it('exposes the expected permission keys', () => {
    expect(ACCESS_PERMISSION_KEYS.length).toBeGreaterThan(0);
    expect(ACCESS_PERMISSION_KEYS).toContain('canUseAI');
  });

  it('builds free permissions by default', () => {
    const permissions = buildPermissions('free');
    expect(permissions.canUseAI).toBe(false);
    expect(permissions.canCreateUnlimitedSections).toBe(false);
    expect(permissions.canAccessEverything).toBe(false);
  });

  it('creates premium permissions with the right unlocks', () => {
    const permissions = buildPermissions('premium');
    expect(permissions.canUseAI).toBe(true);
    expect(permissions.canCreateUnlimitedSections).toBe(true);
    expect(permissions.canUploadAudio).toBe(true);
  });

  it('allows admin overrides', () => {
    const user = {
      plan: 'free' as const,
      permissions: {
        ...buildPermissions('free'),
        canAccessEverything: true,
      },
      isAdmin: false,
    };

    expect(hasPermission(user, 'canUseAI')).toBe(true);
  });

  it('normalizes partial permissions safely', () => {
    const permissions = normalizePermissions({
      canUseAI: true,
      canExportContent: true,
    });

    expect(permissions.canUseAI).toBe(true);
    expect(permissions.canExportContent).toBe(true);
    expect(permissions.canCreateUnlimitedSections).toBe(false);
  });

  it('returns the plan configuration metadata', () => {
    expect(getAccessPlanConfig('premium').label).toBe('Premium');
    expect(getAccessPlanConfig('admin').isAdmin).toBe(true);
  });
});
