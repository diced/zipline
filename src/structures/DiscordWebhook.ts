import req from 'centra';
import { User } from '../entities/User';
import { Shorten } from '../entities/Shorten';
import { Imaged } from './ImageUtil';
import { Shortened } from './ShortenUtil';

export class DiscordWebhook {
    public url: string;
    constructor(url: string) {
        this.url = url;
        this.checkExists();
    }
    async checkExists(): Promise<boolean> {
        const json = await (await req(this.url).send()).json();
        if (json.code === 10015) throw new Error('Unknown Webhook')
        else if (json.code === 50027) throw new Error('Invalid Webhook Token')
        else if (json.code) throw new Error(`DiscordAPIError[${json.code}]: ${json.message}`);
        return json.code ? false : true;
    }
    async sendImageUpdate(user: User, image: Imaged, config: any) {
        const res = await req(this.url, 'POST')
            .header({
                'Content-Type': 'application/json'
            }) 
            .body({
                user: config.discordWebhook.username,
                avatar_url: config.discordWebhook.avatarURL,
                content: `New image uploaded to <${image.origin}> by ${user.username} (${user.id}). ${image.url})`
            })
            .send();

        if (res.statusCode !== 200) throw new Error(`Couldn't send webhook. (Status: ${res.statusCode})`);
    }
    async sendShortenUpdate(user: User, shorten: Shorten, ex: Shortened, config: any) {
        const res = await req(this.url, 'POST')
            .header({
                'Content-Type': 'application/json'
            })
            .body({
                user: config.discordWebhook.username,
                avatar_url: config.discordWebhook.avatarURL,
                content: `New shortened url added to <${ex.origin}> by ${user.username} (${user.id}). <${shorten.origin}> -> <${shorten.url}>`
            })
            .send();

        if (res.statusCode !== 200) throw new Error(`Couldn't send webhook. (Status: ${res.statusCode})`);
    }
}