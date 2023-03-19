import { File, Url, User } from '@prisma/client';
import config from 'lib/config';
import { ConfigDiscordContent } from 'config/Config';
import Logger from 'lib/logger';
import { parseString, ParseValue } from 'utils/parser';

const logger = Logger.get('discord');

export function parseContent(
  content: ConfigDiscordContent,
  args: ParseValue
): ConfigDiscordContent & { url: string } {
  return {
    content: content.content ? parseString(content.content, args) : null,
    embed: content.embed
      ? {
          title: content.embed.title ? parseString(content.embed.title, args) : null,
          description: content.embed.description ? parseString(content.embed.description, args) : null,
          footer: content.embed.footer ? parseString(content.embed.footer, args) : null,
          color: content.embed.color,
          thumbnail: content.embed.thumbnail,
          timestamp: content.embed.timestamp,
          image: content.embed.image,
        }
      : null,
    url: args.link,
  };
}

export async function sendUpload(user: User, file: File, raw_link: string, link: string) {
  if (!config.discord.upload) return;
  if (!config.discord.url && !config.discord.upload.url) return;

  logger.debug(`discord config:\n${JSON.stringify(config.discord)}`);
  const parsed = parseContent(config.discord.upload, {
    file,
    user,
    link,
    raw_link,
  });

  const isImage = file.mimetype.startsWith('image/');

  const body = JSON.stringify({
    username: (config.discord.username ?? config.discord.upload.username) || 'Zipline',
    avatar_url:
      (config.discord.avatar_url ?? config.discord.upload.avatar_url) ||
      'https://raw.githubusercontent.com/diced/zipline/9b60147e112ec5b70170500b85c75ea621f41d03/public/zipline.png',
    content: parsed.content ?? null,
    embeds: parsed.embed
      ? [
          {
            title: parsed.embed.title ?? null,
            description: parsed.embed.description ?? null,
            url: parsed.url ?? null,
            timestamp: parsed.embed.timestamp ? file.createdAt.toISOString() : null,
            color: parsed.embed.color ?? null,
            footer: parsed.embed.footer
              ? {
                  text: parsed.embed.footer,
                }
              : null,
            thumbnail:
              isImage && parsed.embed.thumbnail
                ? {
                    url: parsed.url,
                  }
                : null,
            image:
              isImage && parsed.embed.image
                ? {
                    url: parsed.url,
                  }
                : null,
          },
        ]
      : null,
  });

  logger.debug('attempting to send upload notification to discord', body);
  const res = await fetch(config.discord.url || config.discord.upload.url, {
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    logger
      .error(`Failed to send upload notification to discord: ${res.status}`)
      .error(`Received response:\n${text}`);
  }

  return;
}

export async function sendShorten(user: User, url: Url, link: string) {
  if (!config.discord.shorten) return;
  if (!config.discord.url && !config.discord.shorten.url) return;

  const parsed = parseContent(config.discord.shorten, {
    url,
    user,
    link,
  });

  const body = JSON.stringify({
    username: (config.discord.username ?? config.discord.shorten.username) || 'Zipline',
    avatar_url:
      (config.discord.avatar_url ?? config.discord.shorten.avatar_url) ||
      'https://raw.githubusercontent.com/diced/zipline/9b60147e112ec5b70170500b85c75ea621f41d03/public/zipline.png',
    content: parsed.content ?? null,
    embeds: parsed.embed
      ? [
          {
            title: parsed.embed.title ?? null,
            description: parsed.embed.description ?? null,
            url: parsed.url ?? null,
            timestamp: parsed.embed.timestamp ? url.createdAt.toISOString() : null,
            color: parsed.embed.color ?? null,
            footer: parsed.embed.footer
              ? {
                  text: parsed.embed.footer,
                }
              : null,
          },
        ]
      : null,
  });

  logger.debug('attempting to send shorten notification to discord', body);
  const res = await fetch(config.discord.url || config.discord.shorten.url, {
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    logger
      .error(`Failed to send shorten notification to discord: ${res.status}`)
      .error(`Received response:\n${text}`);
  }

  return;
}
