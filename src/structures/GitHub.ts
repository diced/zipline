import req from "centra";

export class GitHub {
  public static async getFile(filePath: string) {
    const res = await req(
      `https://raw.githubusercontent.com/ZiplineProject/Zipline/master/${filePath}`
    ).send();
    return res.text();
  }
}
