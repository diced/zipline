import { Image } from '../entities/Image';
import { URL } from '../entities/URL';
import { User } from '../entities/User';
import { Config, Configuration, ConfigWebhooks } from './Config';
import { Console } from './logger';

/* eslint-disable indent */
export enum WebhookType {
  UPLOAD,
  DELETE_IMAGE,
  SHORTEN,
  DELETE_URL,
  LOGIN,
  TOKEN_RESET,
  USER_DELETE,
  USER_EDIT,
  CREATE_USER
}

export enum WebhookParseTokens {
  IMAGE_URL = '{image_url}',
  IMAGE_ID = '{image_id}',
  USER_ID = '{user_id}',
  USER_NAME = '{user_name}',
  USER_ADMIN = '{user_admin}',
  URL_ID = '{url_id}',
  URL_URL = '{url}',
  URL_VANITY = '{url_vanity}'
}

export interface WebhookData {
  image?: Image;
  url?: URL;
  user?: User;
  host?: string;
}

export type WebhookSendText =
  | 'upload'
  | 'shorten'
  | 'login'
  | 'create_user'
  | 'delete_image'
  | 'delete_url'
  | 'token_reset'
  | 'user_delete'
  | 'user_edit';

export class WebhookHelper {
  public static convert(strings: WebhookSendText[]) {
    return strings.map(x => WebhookType[x.toUpperCase()]);
  }

  public static conf(config: Config): ConfigWebhooks {
    if (!config.webhooks) return { events: [] };
    return config.webhooks;
  }

  public static parseContent(content: string, data: WebhookData) {
    return content
      .replace(WebhookParseTokens.IMAGE_ID, data.image?.id)
      .replace(WebhookParseTokens.IMAGE_URL, `${data.host}${data.image?.file}`)
      .replace(WebhookParseTokens.URL_ID, data.url?.id)
      .replace(WebhookParseTokens.URL_URL, data.host + data.url?.id)
      .replace(WebhookParseTokens.URL_VANITY, data.url?.vanity)
      .replace(
        WebhookParseTokens.USER_ADMIN,
        data.user?.administrator ? 'Admin' : 'User'
      )
      .replace(WebhookParseTokens.USER_ID, data.user?.id.toString())
      .replace(WebhookParseTokens.USER_NAME, data.user?.username);
  }

  public static async sendWebhook(content: string, data: WebhookData) {
    const config = Configuration.readConfig();
    try {
      await fetch(config.webhooks.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: config.webhooks.username,
          content: WebhookHelper.parseContent(content, data)
        })
      });
    } catch (e) {
      Console.logger(WebhookHelper).error(e);
    }
  }
}
