export const API_ERRORS = {
  // 1xxx, validation and client error
  1000: 'Invalid request schema',
  1001: 'Invalid upload options',
  1002: 'Invalid partial upload',
  1003: 'Partial upload identifier is invalid',
  1004: 'Partial upload was not detected',
  1005: 'Partial uploads only support one file field',
  1006: 'File extension is not allowed',
  1007: 'Invalid characters in filename',
  1008: 'Invalid characters in original filename',
  1009: 'Invalid filename',
  1010: 'Unrecognized file mimetype',
  1011: 'File already in folder',
  1012: 'File not in folder',
  1013: 'File ID is required',
  1014: 'File with this name already exists',
  1015: 'A folder cannot be its own parent',
  1016: 'Cannot move folder into one of its descendants',
  1019: 'Invalid action',
  1020: 'Cannot PATCH without an action',
  1021: 'Cannot delete current session, use log out instead.',
  1022: 'Invalid settings update',
  1023: 'Invalid setup, no settings found. Run the setup process again before exporting data.',
  1024: 'Export is not completed',
  1025: 'No files to export',
  1026: 'No files found for the given request',
  1027: 'No files were deleted.',
  1028: 'No files were updated.',
  1029: 'No ID provided',
  1030: 'No providers to delete',
  1031: 'Session not found in logged in sessions',
  1032: 'Invalid tag specified',
  1033: 'Cannot create tag with the same name',
  1034: 'Tag name already exists',
  1035: 'Invalid invite code',
  1036: "Invites aren't enabled",
  1037: 'User registration is disabled',
  1038: 'Username already exists',
  1039: 'Username is taken',
  1040: 'A user with this username already exists',
  1041: 'Vanity already exists',
  1042: 'Vanity already taken',
  1043: "You can't delete your last OAuth provider without a password",
  1044: 'Invalid username or password',
  1045: 'Invalid code',
  1046: 'Missing WebAuthn challenge ID',
  1047: 'Missing WebAuthn payload',
  1048: 'Passkey registration timed out, try again later',
  1049: 'Error verifying passkey registration',
  1050: 'Could not verify passkey registration',
  1051: 'Error verifying passkey authentication',
  1052: 'Could not verify passkey authentication',
  1053: "You don't have TOTP enabled",
  1054: 'TOTP is disabled',
  1055: 'Password must be a string',
  1056: "The 'maxBytes' value is required",
  1057: "The 'maxFiles' value is required",
  1058: 'From date must be before to date',
  1059: 'From date must be in the past',
  1060: 'Passkey has legacy registration data and cannot be used',
  1061: 'Invalid multipart/form-data request',
  1062: 'No files in multipart/form-data request',
  1063: 'Already linked to this OAuth provider',
  1064: 'Invalid OAuth state parameter',
  1065: 'Invalid MIME type',

  // 2xxx, session errors
  2000: 'Invalid login session',
  2001: 'Invalid token',
  2002: 'Not logged in',
  2003: 'OAuth provider is not configured (or misconfigured)',
  2004: 'Invalid login steps (cookie relying on token)',

  // 3xxx, permission errors
  3000: 'Admin only',
  3001: 'Metrics are disabled',
  3002: 'Folder is not open',
  3003: 'Parent folder does not belong to you',
  3004: 'Password protected',
  3005: 'Incorrect password',
  3006: 'Target folder not found',
  3007: 'You cannot assign this role',
  3008: 'You cannot create this role',
  3009: 'You cannot delete this user',
  3010: 'You cannot delete yourself',
  3011: 'You do not own this folder',
  3012: 'Shortening this URL would exceed your quota of X URLs',
  3013: "You don't have permission to delete the selected files",
  3014: "You don't have permission to modify the selected files",
  3015: 'Not super admin',
  3016: 'OAuth registration is disabled',
  3017: 'OAuth login is not allowed for this account',
  3018: 'Invalid access token provided.',
  3019: 'You cannot modify this user',

  // 4xxx, not founds
  4000: 'File not found',
  4001: 'Folder not found',
  4002: 'Folder or file not found',
  4003: 'Folder or related records not found during deletion',
  4004: 'Invite not found',
  4005: 'Invite not found through ID or code',
  4006: 'No files were moved.',
  4007: 'Parent folder not found',
  4008: 'Target folder not found',
  4009: 'User not found',
  4010: 'No settings table found',
  4011: 'Thumbnails task not found',

  // 5xxx, constraint
  5000: 'File size exceeds the configured limit',
  5001: 'File is too large',
  5002: 'Storage quota exceeded',

  // 6xxx, internal errors
  6000: 'Failed to delete invite',
  6001: 'Failed to fetch version details',
  6002: 'Failed to rename file in datasource',
  6003: 'There was an error during a healthcheck',
  6004: 'Failed to fetch OAuth access token',
  6005: 'No access token in OAuth response',
  6006: 'No refresh token in OAuth response',
  6007: 'Failed to fetch OAuth user',
  6008: 'OAuth provider request failed',
  6009: "Couldn't create user via OAuth profile",
  6010: 'The username is already taken by another account',

  // 9xxx catch all
  9000: 'Bad request',
  9001: 'Forbidden',
  9002: 'Not found',
  9004: 'Internal server error',
} as const satisfies Record<number, string>;

export type ApiErrorCode = keyof typeof API_ERRORS;

export type ApiErrorPayload = {
  error: string;
  code: ApiErrorCode;
  statusCode: number;

  [key: string]: any;
};

export class ApiError extends Error {
  public readonly status: number;
  public additional: Record<string, any>;

  constructor(
    public readonly code: ApiErrorCode,
    message?: string,
    status?: number,
  ) {
    super(message ?? API_ERRORS[code] ?? 'Unknown API error');

    this.status = status ?? ApiError.codeToHttpStatus(code);
    this.additional = {} as Record<string, any>;

    Object.setPrototypeOf(this, new.target.prototype);
  }

  add(key: string, value: any): this {
    this.additional[key] = value;

    return this;
  }

  toJSON(): ApiErrorPayload {
    const formattedMessage = API_ERRORS[this.code]
      ? `E${this.code}${this.message ? `: ${this.message}` : ''}`
      : this.message;

    return {
      error: formattedMessage,
      code: this.code,
      statusCode: this.status,
      ...this.additional,
    };
  }

  public static check(payload: ApiErrorPayload, code: ApiErrorCode): boolean {
    return payload.code === code;
  }

  public static codeToHttpStatus(code: ApiErrorCode): number {
    const override = {
      9000: 400,
      9001: 403,
      9002: 404,
      9004: 500,
    }[code as unknown as number];
    if (override) return override;

    if (code >= 1000 && code < 2000) return 400;
    if (code >= 2000 && code < 3000) return 401;
    if (code >= 3000 && code < 4000) return 403;
    if (code >= 4000 && code < 5000) return 404;
    if (code >= 5000 && code < 6000) return 413;
    if (code >= 6000 && code < 7000) return 500;

    return 500;
  }
}

export class RedirectError extends Error {
  constructor(public readonly url: string) {
    super('Redirect');

    Object.setPrototypeOf(this, new.target.prototype);
  }
}
