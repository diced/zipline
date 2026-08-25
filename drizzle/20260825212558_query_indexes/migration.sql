ALTER INDEX "File_name_idx" RENAME TO "file_name_idx";--> statement-breakpoint
ALTER INDEX "File_userId_size_idx" RENAME TO "file_user_id_size_idx";--> statement-breakpoint
ALTER INDEX "File_folderId_createdAt_idx" RENAME TO "file_folder_id_created_at_idx";--> statement-breakpoint
ALTER INDEX "_FileToTag_B_index" RENAME TO "file_to_tag_tag_id_idx";--> statement-breakpoint
ALTER INDEX "Invite_code_key" RENAME TO "invite_code_key";--> statement-breakpoint
ALTER INDEX "OAuthProvider_provider_oauthId_key" RENAME TO "oauth_provider_provider_oauth_id_key";--> statement-breakpoint
ALTER INDEX "Tag_name_key" RENAME TO "tag_name_key";--> statement-breakpoint
ALTER INDEX "Thumbnail_fileId_key" RENAME TO "thumbnail_file_id_key";--> statement-breakpoint
ALTER INDEX "Url_code_vanity_key" RENAME TO "url_code_vanity_key";--> statement-breakpoint
ALTER INDEX "UserQuota_userId_key" RENAME TO "user_quota_user_id_key";--> statement-breakpoint
ALTER INDEX "User_username_key" RENAME TO "user_username_key";--> statement-breakpoint
ALTER INDEX "User_token_key" RENAME TO "user_token_key";--> statement-breakpoint
ALTER TABLE "Export" RENAME CONSTRAINT "Export_userId_fkey" TO "export_user_id_fkey";--> statement-breakpoint
ALTER TABLE "File" RENAME CONSTRAINT "File_userId_fkey" TO "file_user_id_fkey";--> statement-breakpoint
ALTER TABLE "File" RENAME CONSTRAINT "File_folderId_fkey" TO "file_folder_id_fkey";--> statement-breakpoint
ALTER TABLE "_FileToTag" RENAME CONSTRAINT "_FileToTag_A_fkey" TO "file_to_tag_file_id_fkey";--> statement-breakpoint
ALTER TABLE "_FileToTag" RENAME CONSTRAINT "_FileToTag_B_fkey" TO "file_to_tag_tag_id_fkey";--> statement-breakpoint
ALTER TABLE "Folder" RENAME CONSTRAINT "Folder_parentId_fkey" TO "folder_parent_id_fkey";--> statement-breakpoint
ALTER TABLE "Folder" RENAME CONSTRAINT "Folder_userId_fkey" TO "folder_user_id_fkey";--> statement-breakpoint
ALTER TABLE "IncompleteFile" RENAME CONSTRAINT "IncompleteFile_userId_fkey" TO "incomplete_file_user_id_fkey";--> statement-breakpoint
ALTER TABLE "Invite" RENAME CONSTRAINT "Invite_inviterId_fkey" TO "invite_inviter_id_fkey";--> statement-breakpoint
ALTER TABLE "OAuthProvider" RENAME CONSTRAINT "OAuthProvider_userId_fkey" TO "oauth_provider_user_id_fkey";--> statement-breakpoint
ALTER TABLE "Tag" RENAME CONSTRAINT "Tag_userId_fkey" TO "tag_user_id_fkey";--> statement-breakpoint
ALTER TABLE "Thumbnail" RENAME CONSTRAINT "Thumbnail_fileId_fkey" TO "thumbnail_file_id_fkey";--> statement-breakpoint
ALTER TABLE "Url" RENAME CONSTRAINT "Url_userId_fkey" TO "url_user_id_fkey";--> statement-breakpoint
ALTER TABLE "UserPasskey" RENAME CONSTRAINT "UserPasskey_userId_fkey" TO "user_passkey_user_id_fkey";--> statement-breakpoint
ALTER TABLE "UserQuota" RENAME CONSTRAINT "UserQuota_userId_fkey" TO "user_quota_user_id_fkey";--> statement-breakpoint
ALTER TABLE "UserSession" RENAME CONSTRAINT "UserSession_userId_fkey" TO "user_session_user_id_fkey";--> statement-breakpoint
ALTER TABLE "Export" RENAME CONSTRAINT "Export_pkey" TO "export_pkey";--> statement-breakpoint
ALTER TABLE "File" RENAME CONSTRAINT "File_pkey" TO "file_pkey";--> statement-breakpoint
ALTER TABLE "_FileToTag" RENAME CONSTRAINT "_FileToTag_AB_pkey" TO "file_to_tag_pkey";--> statement-breakpoint
ALTER TABLE "Folder" RENAME CONSTRAINT "Folder_pkey" TO "folder_pkey";--> statement-breakpoint
ALTER TABLE "IncompleteFile" RENAME CONSTRAINT "IncompleteFile_pkey" TO "incomplete_file_pkey";--> statement-breakpoint
ALTER TABLE "Invite" RENAME CONSTRAINT "Invite_pkey" TO "invite_pkey";--> statement-breakpoint
ALTER TABLE "Metric" RENAME CONSTRAINT "Metric_pkey" TO "metric_pkey";--> statement-breakpoint
ALTER TABLE "OAuthProvider" RENAME CONSTRAINT "OAuthProvider_pkey" TO "oauth_provider_pkey";--> statement-breakpoint
ALTER TABLE "Tag" RENAME CONSTRAINT "Tag_pkey" TO "tag_pkey";--> statement-breakpoint
ALTER TABLE "Thumbnail" RENAME CONSTRAINT "Thumbnail_pkey" TO "thumbnail_pkey";--> statement-breakpoint
ALTER TABLE "Url" RENAME CONSTRAINT "Url_pkey" TO "url_pkey";--> statement-breakpoint
ALTER TABLE "UserPasskey" RENAME CONSTRAINT "UserPasskey_pkey" TO "user_passkey_pkey";--> statement-breakpoint
ALTER TABLE "UserQuota" RENAME CONSTRAINT "UserQuota_pkey" TO "user_quota_pkey";--> statement-breakpoint
ALTER TABLE "UserSession" RENAME CONSTRAINT "UserSession_pkey" TO "user_session_pkey";--> statement-breakpoint
ALTER TABLE "User" RENAME CONSTRAINT "User_pkey" TO "user_pkey";--> statement-breakpoint
ALTER TABLE "Zipline" RENAME CONSTRAINT "Zipline_pkey" TO "zipline_pkey";--> statement-breakpoint
CREATE INDEX "file_user_id_created_at_idx" ON "File" ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "folder_user_id_created_at_idx" ON "Folder" ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "folder_parent_id_created_at_idx" ON "Folder" ("parentId","createdAt");--> statement-breakpoint
CREATE INDEX "incomplete_file_user_id_status_idx" ON "IncompleteFile" ("userId","status");--> statement-breakpoint
CREATE INDEX "metric_created_at_idx" ON "Metric" ("createdAt");--> statement-breakpoint
CREATE INDEX "oauth_provider_user_id_provider_idx" ON "OAuthProvider" ("userId","provider");--> statement-breakpoint
CREATE INDEX "thumbnail_path_idx" ON "Thumbnail" ("path");--> statement-breakpoint
CREATE INDEX "url_user_id_idx" ON "Url" ("userId");--> statement-breakpoint
CREATE INDEX "user_passkey_user_id_last_used_idx" ON "UserPasskey" ("userId","lastUsed" DESC);--> statement-breakpoint
CREATE INDEX "user_session_user_id_created_at_idx" ON "UserSession" ("userId","createdAt");