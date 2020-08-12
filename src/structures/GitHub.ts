import fetch from 'node-fetch';

export class GitHub {
    public static async getFile(filePath: string) {
        const res = await fetch('https://raw.githubusercontent.com/ZiplineProject/Zipline/master/' + filePath);
        return res.text();
    }
}