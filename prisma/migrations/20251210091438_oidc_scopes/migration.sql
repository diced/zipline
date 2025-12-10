-- AlterTable
ALTER TABLE "public"."Zipline" ADD COLUMN     "oauthOidcScopeOpenid" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "oauthOidcScopeProfile" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "oauthOidcScopeEmail" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "oauthOidcScopeOfflineAccess" BOOLEAN NOT NULL DEFAULT true;
