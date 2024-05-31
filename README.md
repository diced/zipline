# Zipline 4

! This is a work in progress, the database is not final and is subject to change without a migration. !

Roadmap for v4: https://diced.notion.site/Zipline-v4-Roadmap-058aceb8a35140e7af4c726560aa3db1?pvs=4

## Running Zipline v4

Running Zipline v4 as of now is kind of complicated due to the database being subject to change. At this stage the database is most likely final, but I rather not create migrations while the project is still in development.

### updating image

If you are using the provided docker images, they will be updated on every commit to the `v4` branch. You can pull the latest image by running:

```bash
docker pull ghcr.io/diced/zipline:v4
```

### ⚠ first run ⚠

If you are running v4 for the first time, you must prototype the database using prisma. To do this through docker follow the instructions in the `docker-compose.yml`.

```yml
---
zipline:
  image: ghcr.io/diced/zipline:v4
  # ATTENTION !
  # entrypoint: ['pnpm', 'db:prototype']
  # Uncomment the above for the first run, then comment it out again after it runs once.
  # The database is subject to change, this will reset the current db to match the prisma schema.
```

If you follow the instructions the `zipline` service within the docker-compose.yml file should look similar to this.

```yml
---
zipline:
  image: ghcr.io/diced/zipline:v4
  # ATTENTION !
  entrypoint: ['pnpm', 'db:prototype']
```

This will run `pnpm db:protoype` which will sync the postgres schema with zipline's prisma schema.

You can simply run the following command to start the container with the prototype command now:

```bash
docker compose up
```

#### non docker-compose

If you aren't using docker compose, you can just run the following (this is assuming you have node@lts and pnpm@9 installed):

```bash
pnpm db:prototype
```

Stop the containers with `Ctrl + C` or `docker compose down` after the prisma command has finished running successfully (hopefully).

### after first run

Make sure to comment the `entrypoint` line in the docker-compose.yml file after the first run. If this is not run, every time the container is started it will run the prototype command instead of actually running Zipline.

Once you have run the prototype command, you can start the container with the following command:

```bash
docker compose up
```

or (detached)

```bash
docker compose up -d
```

# Contributing

Here are some simple instructions to get Zipline v4 running and ready to develop on.

## Prerequisites

- nodejs (lts -> 21.x or 18.x)
- pnpm (9.x)
- a postgresql server

## Setup

You should probably use a `.env` file to manage your environment variables, here is an example .env file:

````bash
DEBUG=zipline

CORE_SECRET="a secret"
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/zipline?schema=public"

MFA_TOTP_ENABLED=true

FILES_ROUTE='/'
URLS_ROUTE='/'

FILES_REMOVE_GPS_METADATA=false

DATASOURCE_TYPE='local'
DATASOURCE_LOCAL_DIRECTORY='./uploads'

SCHEDULER_METRICS_INTERVAL=1min

FILES_MAX_FILE_SIZE=100mb

# OAUTH_BYPASS_LOCAL_LOGIN=true
OAUTH_DISCORD_CLIENT_ID=x
OAUTH_DISCORD_CLIENT_SECRET=x

OAUTH_GITHUB_CLIENT_ID=x
OAUTH_GITHUB_CLIENT_SECRET=x

OAUTH_GOOGLE_CLIENT_ID=x-x.apps.googleusercontent.com
OAUTH_GOOGLE_CLIENT_SECRET=x-x-x

OAUTH_AUTHENTIK_CLIENT_ID=x
OAUTH_AUTHENTIK_CLIENT_SECRET=x
OAUTH_AUTHENTIK_AUTHORIZE_URL=http://localhost:9000/application/o/authorize/
OAUTH_AUTHENTIK_USERINFO_URL=http://localhost:9000/application/o/userinfo/
OAUTH_AUTHENTIK_TOKEN_URL=http://localhost:9000/application/o/token/

FEATURES_OAUTH_REGISTRATION=true
FEATURES_USER_REGISTRATION=true

DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/x/x-x
DISCORD_ONUPLOAD_USERNAME=testupload
DISCORD_ONUPLOAD_CONTENT="hello {user.username} {file.name}\n```json\n{debug.jsonf}\n```"

DISCORD_ONSHORTEN_USERNAME=testshorten
DISCORD_ONSHORTEN_CONTENT="hello {user.username} {url.id} {link.returned} {url.createdAt::locale::en-UK,Pacific/Auckland}\n```json\n{debug.jsonf}\n```"

FEATURES_METRICS_ADMIN_ONLY=true
````

Install dependencies:

```bash
pnpm install
```

The next step is important! You need to prototype the database using prisma. The command below will read the `DATABASE_URL` environment variable to sync the database. To do this run the following command:

```bash
pnpm db:prototype
```

Finally you may start the development server:

```bash
pnpm dev
```

If you wish to build the production version of Zipline, you can run the following command:

```bash
pnpm build
```

And to run the production version of Zipline:

```bash
pnpm start
```
