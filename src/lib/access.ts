export type AccessPlan = 'free' | 'premium' | 'admin';

export const ACCESS_PERMISSION_KEYS = [
  'canCreateUnlimitedSections',
  'canCreateUnlimitedStages',
  'canUsePremiumLibrary',
  'canUploadAudio',
  'canUseBackup',
  'canExportContent',
  'canUseAI',
  'canManageUsers',
  'canManagePermissions',
  'canUseAdvancedThemes',
  'canUseAdvancedPresentation',
  'canAccessEverything',
] as const;

export type AccessPermissionKey = (typeof ACCESS_PERMISSION_KEYS)[number];

export type UserAccess = {
  plan: AccessPlan;
  isAdmin?: boolean;
  permissions: Partial<Record<AccessPermissionKey, boolean>>;
};

export const DEFAULT_FREE_PERMISSIONS: Record<AccessPermissionKey, boolean> = {
  canCreateUnlimitedSections: false,
  canCreateUnlimitedStages: false,
  canUsePremiumLibrary: false,
  canUploadAudio: false,
  canUseBackup: false,
  canExportContent: false,
  canUseAI: false,
  canManageUsers: false,
  canManagePermissions: false,
  canUseAdvancedThemes: false,
  canUseAdvancedPresentation: false,
  canAccessEverything: false,
};

export const DEFAULT_PREMIUM_PERMISSIONS: Record<AccessPermissionKey, boolean> = {
  ...DEFAULT_FREE_PERMISSIONS,
  canCreateUnlimitedSections: true,
  canCreateUnlimitedStages: true,
  canUsePremiumLibrary: true,
  canUploadAudio: true,
  canUseBackup: true,
  canExportContent: true,
  canUseAI: true,
  canUseAdvancedThemes: true,
  canUseAdvancedPresentation: true,
  canAccessEverything: false,
};

export const DEFAULT_ADMIN_PERMISSIONS: Record<AccessPermissionKey, boolean> = {
  ...DEFAULT_PREMIUM_PERMISSIONS,
  canManageUsers: true,
  canManagePermissions: true,
  canAccessEverything: true,
};

export function normalizePermissions(
  permissions: Partial<Record<AccessPermissionKey, boolean>> | undefined
): Record<AccessPermissionKey, boolean> {
  return ACCESS_PERMISSION_KEYS.reduce((acc, key) => {
    acc[key] = Boolean(permissions?.[key]);
    return acc;
  }, {} as Record<AccessPermissionKey, boolean>);
}

export function buildPermissions(plan: AccessPlan): Record<AccessPermissionKey, boolean> {
  switch (plan) {
    case 'premium':
      return { ...DEFAULT_PREMIUM_PERMISSIONS };
    case 'admin':
      return { ...DEFAULT_ADMIN_PERMISSIONS };
    case 'free':
    default:
      return { ...DEFAULT_FREE_PERMISSIONS };
  }
}

export function hasPermission(user: Pick<UserAccess, 'isAdmin' | 'permissions'>, key: AccessPermissionKey): boolean {
  const permissions = normalizePermissions(user.permissions);
  if (user.isAdmin || permissions.canAccessEverything) return true;
  return !!permissions[key];
}

export function getAccessPlanConfig(plan: AccessPlan) {
  const config = {
    free: {
      label: 'Gratuito',
      isAdmin: false,
      limits: {
        sections: 3,
        stagesPerSection: 10,
      },
    },
    premium: {
      label: 'Premium',
      isAdmin: false,
      limits: {
        sections: Infinity,
        stagesPerSection: Infinity,
      },
    },
    admin: {
      label: 'Administrador',
      isAdmin: true,
      limits: {
        sections: Infinity,
        stagesPerSection: Infinity,
      },
    },
  } as const;

  return config[plan] ?? config.free;
}

export function getPlanLimits(plan: AccessPlan) {
  return getAccessPlanConfig(plan).limits;
}
