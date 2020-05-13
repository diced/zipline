import fetch from 'node-fetch';
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
        const json = await (await fetch(this.url)).json();
        if (json.code === 10015) throw new Error('Unknown Webhook')
        else if (json.code === 50027) throw new Error('Invalid Webhook Token')
        else if (json.code) throw new Error(`DiscordAPIError[${json.code}]: ${json.message}`);
        return json.code ? false : true;
    }
    async sendImageUpdate(user: User, image: Imaged, config: any) {
        try {
            await (await fetch(this.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user: config.discordWebhook.username,
                    avatar_url: config.discordWebhook.avatarURL,
                    content: `New image uploaded to< ${image.origin}> by ${user.username} (${user.id}). [View Image](${image.url})`
                })
            }));
        } catch (e) {
            throw new Error(`Coulndn't send webhook: ${e.message}`)
        }
    }
    async sendShortenUpdate(user: User, shorten: Shorten, ex: Shortened, config: any) {
        try {
            await (await fetch(this.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user: config.discordWebhook.username,
                    avatar_url: config.discordWebhook.avatarURL,
                    content: `New shortened url added to <${ex.origin}> by ${user.username} (${user.id}). <${shorten.origin}> -> <${shorten.url}>`
                })
            }));
        } catch (e) {
            throw new Error(`Coulndn't send webhook: ${e.message}`)
        }
    }
}