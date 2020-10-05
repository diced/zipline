import { ORMHandler } from ".";
import Logger from "@ayanaware/logger";

export function notes(orm: ORMHandler) {
  return setInterval(async () => {
    const all = await orm.repos.note.find();
    for (const note of all) {
      if (note.expriation) {
        const expiration = Number(note.creation) + Number(note.expriation);
        if (Date.now() > expiration) {
          orm.repos.note.delete({ id: note.id });
          Logger.get("TypeX.Notes").info(
            `Note deleted ${note.id} and ${
              note.expriation
                ? `expired in ${note.expriation}`
                : `never expired`
            }`
          );
        }
      }
    }
  }, 5000);
}
