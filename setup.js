const inquirer = require('inquirer');

(async () => {
    const database = await inquirer.prompt([
        {
            type: 'list',
            name: 'database',
            message: 'What database type?',
            choices: [
                { name: 'postgres', extra: 'This is what we recomend using.' },
                { name: 'cockroachdb' },
                { name: 'mysql' },
                { name: 'mariadb' },
                { name: 'mssql' },
                { name: 'sqlite' },
                { name: 'sqlite3' },
                { name: 'mongodb', extra: 'No support yet' },
            ]
        },
        {
            type: 'input',
            name: 'host',
            message: 'Database Host'
        },
        {
            type: 'number',
            name: 'port',
            message: 'Database Port'
        },
        {
            type: 'input',
            name: 'username',
            message: 'Database User'
        },
        {
            type: 'password',
            name: 'password',
            message: 'Database Password'
        },
        {
            type: 'input',
            name: 'database',
            message: 'Database'
        }
    ])

    console.log('\nCore\n')

    const core = await inquirer.prompt([
        {
            type: 'input',
            name: 'secret',
            message: 'Secret (this must be secure)'
        },
        {
            type: 'number',
            name: 'port',
            message: 'Serve on Port'
        }
    ]);

    console.log('\nUploader\n')

    const uploader = await inquirer.prompt([
        {
            type: 'input',
            name: 'directory',
            message: 'Uploads Directory'
        },
        {
            type: 'confirm',
            name: 'original',
            message: 'Keep Original?'
        }
    ]);

    console.log('\nURLs\n')

    const url = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'vanity',
            message: 'Allow vanity URLs'
        }
    ]);
})();