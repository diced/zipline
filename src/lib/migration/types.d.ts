// types for @prisma/migrate so vscode cant complain

declare module '@prisma/migrate/dist/Migrate' {
  export class Migrate {
    constructor(schemaPath: string);
    public applyMigrations(): Promise<{ appliedMigrationNames: string[] }>;
    public stop(): void;
  }
}

declare module '@prisma/migrate/dist/utils/ensureDatabaseExists' {
  export function ensureDatabaseExists(command: string, schemaPath: string): Promise<boolean>;
}
