import type { ApiLoginResponse } from '@/pages/api/auth/login';
import type { ApiLogoutResponse } from '@/pages/api/auth/logout';

import type { ApiUserResponse } from '@/pages/api/user';
import type { ApiUserRecentResponse } from '@/pages/api/user/recent';
import type { ApiUserTokenResponse } from '@/pages/api/user/token';
import type { ApiUserFilesIdResponse } from '@/pages/api/user/files/[id]';
import type { ApiUserFilesResponse } from '@/pages/api/user/files';

import type { ApiHealthcheckResponse } from '@/pages/api/healthcheck';
import type { ApiSetupResponse } from '@/pages/api/setup';
import type { ApiUploadResponse } from '@/pages/api/upload';

export type Response = {
  '/api/auth/login': ApiLoginResponse;
  '/api/auth/logout': ApiLogoutResponse;
  '/api/user/files/[id]': ApiUserFilesIdResponse;
  '/api/user/files': ApiUserFilesResponse;
  '/api/user': ApiUserResponse;
  '/api/user/recent': ApiUserRecentResponse;
  '/api/user/token': ApiUserTokenResponse;
  '/api/healthcheck': ApiHealthcheckResponse;
  '/api/setup': ApiSetupResponse;
  '/api/upload': ApiUploadResponse;
};
