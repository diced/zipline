import { z } from 'zod';

export const discordUrlPreviewModeSchema = z.enum(['destination', 'components', 'none']);
export type DiscordUrlPreviewMode = z.infer<typeof discordUrlPreviewModeSchema>;

export const discordFilePreviewModeSchema = z.enum(['components', 'none']);
export type DiscordFilePreviewMode = z.infer<typeof discordFilePreviewModeSchema>;
