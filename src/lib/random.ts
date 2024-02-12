export function randomCharacters(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;

  let result = '';

  for (let i = 0; i !== length; ++i) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return result;
}
