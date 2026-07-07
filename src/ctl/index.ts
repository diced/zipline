import { Command } from 'commander';
import packageJson from '../../package.json' with { type: 'json' };
import { listUsers } from './commands/list-users';
import { readConfig } from './commands/read-config';
import { setUser } from './commands/set-user';
import { importDir } from './commands/import-dir';
import { exportConfig } from './commands/export-config';

const cli = new Command();

cli.name('ziplinectl').version(packageJson.version).description('control utility for zipline');

cli
  .command('read-config')
  .option('-f, --format', 'whether or not to format the json')
  .summary('output the configuration as json, exactly how Zipline sees it')
  .action(readConfig);

cli
  .command('list-users')
  .option('-f, --format', 'whether or not to format the json')
  .option(
    '-e, --extra [extra...]',
    'extra properties to include in the output, "list" is used to list all possible keys',
  )
  .option('-i, --id [user_id]', 'list a specific user by their id')
  .summary('list all users')
  .action(listUsers);

cli
  .command('set-user')
  .option('-i, --id <user_id>', 'the id of the user to set')
  .argument('<property>', 'the property to set')
  .argument('<value>', 'the value to set')
  .action(setUser);

cli
  .command('import-dir')
  .option(
    '-i, --id [user_id]',
    'the id that imported files should belong to. if unspecificed the user with the "administrator" username as well as the "SUPERADMIN" role will be used',
  )
  .option('--skip-db', 'do not add the files to the database')
  .option('--skip-ds', 'do not add the files to the datasource')
  .option('-f, --folder [folder_id]', 'an optional folder to add the files to')
  .argument('<directory>', 'the directory to import into Zipline')
  .action(importDir);

cli
  .command('export-config')
  .summary('export the current configuration as environment variables')
  .option('-y, --yml', 'export the configuration in a yml format', false)
  .option('-d, --show-defaults', 'ignore default values and only export changed values', false)
  .action(exportConfig);

cli.parse();
