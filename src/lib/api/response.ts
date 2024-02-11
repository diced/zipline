import { ApiAuthInvitesResponse } from '@/pages/api/auth/invites';
import { ApiAuthInvitesIdResponse } from '@/pages/api/auth/invites/[id]';
import { ApiLoginResponse } from '@/pages/api/auth/login';
import { ApiLogoutResponse } from '@/pages/api/auth/logout';
import { ApiAuthOauthResponse } from '@/pages/api/auth/oauth';
import { ApiAuthRegisterResponse } from '@/pages/api/auth/register';
import { ApiAuthWebauthnResponse } from '@/pages/api/auth/webauthn';
import { ApiHealthcheckResponse } from '@/pages/api/healthcheck';
import { ApiServerClearTempResponse } from '@/pages/api/server/clear_temp';
import { ApiServerClearZerosResponse } from '@/pages/api/server/clear_zeros';
import { ApiServerRequerySizeResponse } from '@/pages/api/server/requery_size';
import { ApiSetupResponse } from '@/pages/api/setup';
import { ApiStatsResponse } from '@/pages/api/stats';
import { ApiUploadResponse } from '@/pages/api/upload';
import { ApiUserResponse } from '@/pages/api/user';
import { ApiUserFilesResponse } from '@/pages/api/user/files';
import { ApiUserFilesIdResponse } from '@/pages/api/user/files/[id]';
import { ApiUserFilesIdPasswordResponse } from '@/pages/api/user/files/[id]/password';
import { ApiUserFilesTransactionResponse } from '@/pages/api/user/files/transaction';
import { ApiUserFoldersResponse } from '@/pages/api/user/folders';
import { ApiUserFoldersIdResponse } from '@/pages/api/user/folders/[id]';
import { ApiUserMfaPasskeyResponse } from '@/pages/api/user/mfa/passkey';
import { ApiUserMfaTotpResponse } from '@/pages/api/user/mfa/totp';
import { ApiUserRecentResponse } from '@/pages/api/user/recent';
import { ApiUserStatsResponse } from '@/pages/api/user/stats';
import { ApiUserTagsResponse } from '@/pages/api/user/tags';
import { ApiUserTagsIdResponse } from '@/pages/api/user/tags/[id]';
import { ApiUserTokenResponse } from '@/pages/api/user/token';
import { ApiUserUrlsResponse } from '@/pages/api/user/urls';
import { ApiUserUrlsIdResponse } from '@/pages/api/user/urls/[id]';
import { ApiUsersResponse } from '@/pages/api/users';
import { ApiUsersIdResponse } from '@/pages/api/users/[id]';
import { ApiVersionResponse } from '@/pages/api/version';

export type Response = {
  '/api/auth/invites/[id]': ApiAuthInvitesIdResponse;
  '/api/auth/invites': ApiAuthInvitesResponse;
  '/api/auth/register': ApiAuthRegisterResponse;
  '/api/auth/webauthn': ApiAuthWebauthnResponse;
  '/api/auth/oauth': ApiAuthOauthResponse;
  '/api/auth/login': ApiLoginResponse;
  '/api/auth/logout': ApiLogoutResponse;
  '/api/user/mfa/passkey': ApiUserMfaPasskeyResponse;
  '/api/user/mfa/totp': ApiUserMfaTotpResponse;
  '/api/user/folders/[id]': ApiUserFoldersIdResponse;
  '/api/user/folders': ApiUserFoldersResponse;
  '/api/user/files/[id]/password': ApiUserFilesIdPasswordResponse;
  '/api/user/files/[id]': ApiUserFilesIdResponse;
  '/api/user/files/transaction': ApiUserFilesTransactionResponse;
  '/api/user/files': ApiUserFilesResponse;
  '/api/user/urls/[id]': ApiUserUrlsIdResponse;
  '/api/user/urls': ApiUserUrlsResponse;
  '/api/user/tags/[id]': ApiUserTagsIdResponse;
  '/api/user/tags': ApiUserTagsResponse;
  '/api/user': ApiUserResponse;
  '/api/user/stats': ApiUserStatsResponse;
  '/api/user/recent': ApiUserRecentResponse;
  '/api/user/token': ApiUserTokenResponse;
  '/api/users': ApiUsersResponse;
  '/api/users/[id]': ApiUsersIdResponse;
  '/api/server/clear_temp': ApiServerClearTempResponse;
  '/api/server/clear_zeros': ApiServerClearZerosResponse;
  '/api/server/requery_size': ApiServerRequerySizeResponse;
  '/api/healthcheck': ApiHealthcheckResponse;
  '/api/setup': ApiSetupResponse;
  '/api/upload': ApiUploadResponse;
  '/api/version': ApiVersionResponse;
  '/api/stats': ApiStatsResponse;
};