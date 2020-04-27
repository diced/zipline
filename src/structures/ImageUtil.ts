import { getType } from 'mime';

export interface Imaged {
    url: string;
    origin: string;
    protocol: string;
    key: string;
    extension: string;
    mime: string;
}

export class ImageUtil {
    static parseURL(url: string): Imaged {
        const parsed = new URL(url);
        return {
            url: parsed.href,
            origin: parsed.origin,
            protocol: parsed.protocol.slice(0, -1),
            key: parsed.pathname.startsWith('/u/') ? parsed.pathname.slice(3).split('.')[0] : null,
            extension: parsed.pathname.startsWith('/u/') ? parsed.pathname.slice(3).split('.')[1] : null,
            mime: parsed.pathname.startsWith('/u/') ? getType(parsed.pathname.slice(3).split('.')[1]) : null
        }
    }
}