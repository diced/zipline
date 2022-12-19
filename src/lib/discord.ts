import { Image, Url, User } from '@prisma/client';
import config from 'lib/config';
import { ConfigDiscordContent } from 'lib/config/Config';
import Logger from './logger';
import { parseString, ParseValue } from './utils/parser';

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
    url: args[3],
  };
}

export async function sendUpload(user: User, image: Image, raw_link: string, link: string) {
  if (!config.discord.upload) return;

  const parsed = parseContent(config.discord.upload, {
    file: image,
    user,
    link,
    raw_link,
  });

  const isImage = image.mimetype.startsWith('image/');

  const body = JSON.stringify({
    username: config.discord.username,
    avatar_url: config.discord.avatar_url,
    content: parsed.content ?? null,
    embeds: parsed.embed
      ? [
          {
            title: parsed.embed.title ?? null,
            description: parsed.embed.description ?? null,
            url: parsed.url ?? null,
            timestamp: parsed.embed.timestamp ? image.created_at.toISOString() : null,
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
  const res = await fetch(config.discord.url, {
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

  const parsed = parseContent(config.discord.shorten, {
    url,
    user,
    link,
  });

  const body = JSON.stringify({
    username: config.discord.username,
    avatar_url: config.discord.avatar_url,
    content: parsed.content ?? null,
    embeds: parsed.embed
      ? [
          {
            title: parsed.embed.title ?? null,
            description: parsed.embed.description ?? null,
            url: parsed.url ?? null,
            timestamp: parsed.embed.timestamp ? url.created_at.toISOString() : null,
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
  const res = await fetch(config.discord.url, {
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
