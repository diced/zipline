export const roleValues = ['USER', 'ADMIN', 'SUPERADMIN'] as const;
export type Role = (typeof roleValues)[number];
export const Role = {
  USER: roleValues[0],
  ADMIN: roleValues[1],
  SUPERADMIN: roleValues[2],
} as const;

export const oauthProviderTypeValues = ['DISCORD', 'GOOGLE', 'GITHUB', 'OIDC'] as const;
export type OAuthProviderType = (typeof oauthProviderTypeValues)[number];
export const OAuthProviderType = {
  DISCORD: oauthProviderTypeValues[0],
  GOOGLE: oauthProviderTypeValues[1],
  GITHUB: oauthProviderTypeValues[2],
  OIDC: oauthProviderTypeValues[3],
} as const;

export const userFilesQuotaValues = ['BY_BYTES', 'BY_FILES'] as const;
export type UserFilesQuota = (typeof userFilesQuotaValues)[number];
export const UserFilesQuota = {
  BY_BYTES: userFilesQuotaValues[0],
  BY_FILES: userFilesQuotaValues[1],
} as const;

export const incompleteFileStatusValues = ['PENDING', 'PROCESSING', 'COMPLETE', 'FAILED'] as const;
export type IncompleteFileStatus = (typeof incompleteFileStatusValues)[number];
export const IncompleteFileStatus = {
  PENDING: incompleteFileStatusValues[0],
  PROCESSING: incompleteFileStatusValues[1],
  COMPLETE: incompleteFileStatusValues[2],
  FAILED: incompleteFileStatusValues[3],
} as const;
