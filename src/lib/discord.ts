import { Image, Url, User } from '@prisma/client';
import { ConfigDiscordContent } from 'lib/config/Config';
import config from 'lib/config';
import Logger from './logger';

// [user, image, url, route (ex. https://example.com/r/something.png)]
export type Args = [User, Image?, Url?, string?];

function parse(str: string, args: Args) {
  if (!str) return null;

  str = str
    .replace(/{user\.admin}/gi, args[0].administrator ? 'yes' : 'no')
    .replace(/{user\.id}/gi, args[0].id.toString())
    .replace(/{user\.name}/gi, args[0].username)
    .replace(/{link}/gi, args[3]);

  if (args[1]) str = str
    .replace(/{file\.id}/gi, args[1].id.toString())
    .replace(/{file\.mime}/gi, args[1].mimetype)
    .replace(/{file\.file}/gi, args[1].file)
    .replace(/{file\.created_at.full_string}/gi, args[1].created_at.toLocaleString())
    .replace(/{file\.created_at.time_string}/gi, args[1].created_at.toLocaleTimeString())
    .replace(/{file\.created_at.date_string}/gi, args[1].created_at.toLocaleDateString());

  if (args[2]) str = str
    .replace(/{url\.id}/gi, args[2].id.toString())
    .replace(/{url\.vanity}/gi, args[2].vanity ? args[2].vanity : 'none')
    .replace(/{url\.destination}/gi, args[2].destination)
    .replace(/{url\.created_at.full_string}/gi, args[2].created_at.toLocaleString())
    .replace(/{url\.created_at.time_string}/gi, args[2].created_at.toLocaleTimeString())
    .replace(/{url\.created_at.date_string}/gi, args[2].created_at.toLocaleDateString());

  return str;
}

export function parseContent(content: ConfigDiscordContent, args: Args): ConfigDiscordContent & { url: string } {
  return {
    content: parse(content.content, args),
    embed: content.embed ? {
      title: parse(content.embed.title, args),
      description: parse(content.embed.description, args),
      footer: parse(content.embed.footer, args),
      color: content.embed.color,
      thumbnail: content.embed.thumbnail,
      timestamp: content.embed.timestamp,
      image: content.embed.image,
    } : null,
    url: args[3],
  };
}

export async function sendUpload(user: User, image: Image, host: string) {
  if (!config.discord.upload) return;

  const parsed = parseContent(config.discord.upload, [user, image, null, host]);
  const isImage = image.mimetype.startsWith('image/');

  const body = {
    username: config.discord.username,
    avatar_url: config.discord.avatar_url,
    content: parsed.content ?? null,
    embeds: parsed.embed ? [{
      title: parsed.embed.title ?? null,
      description: parsed.embed.description ?? null,
      url: parsed.url ?? null,
      timestamp: parsed.embed.timestamp ? image.created_at.toISOString() : null,
      color: parsed.embed.color ?? null,
      footer: parsed.embed.footer ? {
        text: parsed.embed.footer,
      } : null,
      thumbnail: isImage && parsed.embed.thumbnail ? {
        url: parsed.url,
      } : null,
      image: isImage && parsed.embed.image ? {
        url: parsed.url,
      } : null,
    }] : null,
  };

  const res = await fetch(config.discord.url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    Logger.get('discord').error(`Failed to send upload notification to discord: ${res.status} ${res.statusText}`);
    Logger.get('discord').error(`Received response: ${text}`);
  }

  return;
}

export async function sendShorten(user: User, url: Url, host: string) {
  if (!config.discord.shorten) return;

  const parsed = parseContent(config.discord.shorten, [user, null, url, host]);

  const body = {
    username: config.discord.username,
    avatar_url: config.discord.avatar_url,
    content: parsed.content ?? null,
    embeds: parsed.embed ? [{
      title: parsed.embed.title ?? null,
      description: parsed.embed.description ?? null,
      url: parsed.url ?? null,
      timestamp: parsed.embed.timestamp ? url.created_at.toISOString() : null,
      color: parsed.embed.color ?? null,
      footer: parsed.embed.footer ? {
        text: parsed.embed.footer,
      } : null,
    }] : null,
  };

  const res = await fetch(config.discord.url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    Logger.get('discord').error(`Failed to send url shorten notification to discord: ${res.status} ${res.statusText}`);
  }

  return;
}