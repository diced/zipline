<div align="center">
  <img src="https://raw.githubusercontent.com/diced/zipline/trunk/public/zipline_small.png"/>

The next generation ShareX / File upload server

![Stars](https://img.shields.io/github/stars/diced/zipline?logo=github&style=flat)
![Version](https://img.shields.io/github/package-json/v/diced/zipline?logo=git&logoColor=white&style=flat)
![GitHub last commit (branch)](https://img.shields.io/github/last-commit/diced/zipline/trunk?logo=git&logoColor=white&style=flat)
[![Discord](https://img.shields.io/discord/729771078196527176?color=%23777ed3&label=discord&logo=discord&logoColor=white&style=flat)](https://discord.gg/EAhCRfGxCF)

![Build](https://img.shields.io/github/actions/workflow/status/diced/zipline/build.yml?logo=github&style=flat&branch=trunk)

[zipline.diced.sh](https://zipline.diced.sh) | [old v3.zipline.diced.sh](https://v3.zipline.diced.sh)

<!-- TODO: change these links and image branch -->

</div>

## Features

- Setup Quickly: [Get Started with Docker](https://zipline.diced.sh/docs/get-started/docker)
- Configure
- Upload any file
- Folders
- Tags
- URL shortening
- Embeds
- Discord Webhooks
- HTTP Webhooks
- OAuth2
- 2FA
- Passkeys
- Password Protection
- Image Compression
- Video Thumbnails
- API
- PWA
- Partial Uploads
- Invites
- Quotas
- Custom Themes
- ... and more!

# Usage

Visit [the docs](https://zipline.diced.sh/docs/get-started/docker) for a more in-depth guide on how to get started.

## Install and Run with Docker

This is the recommended way to run Zipline:

```yml
services:
  postgresql:
    image: postgres:16
    restart: unless-stopped
    env_file:
      - .env
    environment:
      POSTGRES_USER: ${POSTGRESQL_USER:-zipline}
      POSTGRES_PASSWORD: ${POSTGRESQL_PASSWORD:?POSTGRESSQL_PASSWORD is required}
      POSTGRES_DB: ${POSTGRESQL_DB:-zipline}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD', 'pg_isready', '-U', 'zipline']
      interval: 10s
      timeout: 5s
      retries: 5

  zipline:
    image: ghcr.io/diced/zipline
    ports:
      - '3000:3000'
    env_file:
      - .env
    environment:
      - DATABASE_URL=postgres://${POSTGRESQL_USER:-zipline}:${POSTGRESQL_PASSWORD}@postgresql:5432/${POSTGRESQL_DB:-zipline}
    depends_on:
      postgresql:
        condition: service_healthy
    volumes:
      - './uploads:/zipline/uploads'
      - './public:/zipline/public'
      - './themes:/zipline/themes'
    healthcheck:
      test: ['CMD', 'wget', '-q', '--spider', 'http://localhost:3000/api/healthcheck']
      interval: 15s
      timeout: 2s
      retries: 2

volumes:
  pgdata:
```

### Volumes

- `./uploads` - The folder where all the user uploads are stored (the default is `./uploads`)
- `./public` - The folder where all the public assets are stored (must mount to `/zipline/public`)
- `./themes` - The folder where all the custom themes are stored (must mount to `/zipline/themes`)

### Generating Secrets

```bash
echo "POSTGRESQL_PASSWORD=$(openssl rand -base64 42 | tr -dc A-Za-z0-9 | cut -c -32 | tr -d '\n')" > .env
echo "CORE_SECRET=$(openssl rand -base64 42 | tr -dc A-Za-z0-9 | cut -c -32 | tr -d '\n')" >> .env
```

Without the `CORE_SECRET` environment variable, Zipline will not start.

### Changing where uploads are stored

By default, Zipline will default to the `./uploads` folder, which is also reflected in the `docker-compose.yml` above. If you want to change this, you can set the `DATASOURCE_LOCAL_DIRECTORY` environment variable to a different path.

```bash
DATASOURCE_LOCAL_DIRECTORY=/path/to/your/local/files
# or relative to the working directory
DATASOURCE_LOCAL_DIRECTORY=./relative/path/to/files
```

> [!NOTE]  
> Remember to change volume mappings in the docker-compose.yml file if you change this.

### Changing the port and hostname

By default, Zipline binds to `0.0.0.0:3000`, which is also reflected in the `docker-compose.yml` above. If you want to change this, you can set the `CORE_PORT` and `CORE_HOSTNAME` environment variables to a different port and hostname.

```bash
CORE_PORT=80
CORE_HOSTNAME=localhost
```

> [!NOTE]
> If you change the port, you will need to update the `ports` section in the `docker-compose.yml` file.

### Using S3

If you want to use S3 instead of the local filesystem, you can set the following environment variables:

```bash
DATASOURCE_TYPE=s3

DATASOURCE_S3_ACCESS_KEY_ID=access_key_id
DATASOURCE_S3_SECRET_ACCESS_KEY=secret
DATASOURCE_S3_BUCKET=zipline
DATASOURCE_S3_REGION=us-west-2
```

For more information, like other providers, see the [docs](https://zipline.diced.sh/docs/config/datasource#s3-datasource).

### Starting Zipline

Simply run the following command to start the server:

```bash
docker compose up -d
```

You should be able to access the website at `http://localhost:3000` or the port you specified.

## Manual Install

See [docs](https://zipline.diced.sh/docs/get-started/source) for more information.

# Migrating from v3

Zipline v4 was a complete rewrite, and as such, there is no upgrade path from v3 to v4. You will need to export your data from v3 and import it into v4. This process is made easier by the fact that v4 has a built-in importer to import data from v3.

See [migration](https://zipline.diced.sh/docs/migrate) for more information.

# Contributing

Contributions of any kind are welcome, whether they are bug reports, pull requests, or feature requests.

## Bug Reports

Create an issue on GitHub and use the template, please include the following (if one of them is not applicable to the issue then it's not needed):

- The steps to reproduce the bug
- Logs of Zipline
- The version of Zipline, and whether or not you are using Docker (include the image digest/tag if possible)
- Your OS & Browser including server OS
- What you were expecting to see
- How it can be fixed (if you know)

## Feature Requests

Create a discussion on GitHub, and please include the following:

- Brief explanation of your feature in the title (very brief)
- How it would work (be detailed)

## Pull Requests

Create a pull request on GitHub. If your PR does not pass the action checks, then please fix the errors. If your PR was submitted before a release, and I have pushed a new release, please make sure to update your PR to reflect any changes, usually this is handled by GitHub.

### Development

Here's how to setup Zipline for development

#### Prerequisites

- nodejs (lts -> 20.x, 22.x)
- pnpm (10.x)
- a postgresql server

#### Setup

You should probably use a `.env` file to manage your environment variables, here is an example .env file with every available environment variable:

```bash
DEBUG=zipline

# required
CORE_SECRET="a secret that is 32 characters long"

# required
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/zipline?schema=public"

# these are optional
CORE_PORT=3000
CORE_HOSTNAME=0.0.0.0

# one of these is required
DATASOURCE_TYPE="local"
# DATASOURCE_TYPE="s3"

# if DATASOURCE_TYPE=local
DATASOURCE_LOCAL_DIRECTORY="/path/to/your/local/files"

# if DATASOURCE_TYPE=s3
# DATASOURCE_S3_ACCESS_KEY_ID="your-access-key-id"
# DATASOURCE_S3_SECRET_ACCESS_KEY="your-secret-access-key"
# DATASOURCE_S3_REGION="your-region"
# DATASOURCE_S3_BUCKET="your-bucket"
# DATASOURCE_S3_ENDPOINT="your-endpoint"
# ^ if using a custom endpoint other than aws s3

# optional but both are required if using ssl
# SSL_KEY="/path/to/your/ssl/key"
# SSL_CERT="/path/to/your/ssl/cert"
```

Install dependencies:

```bash
pnpm install
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

#### Making changes to the database schema

Zipline uses [prisma](https://www.prisma.io/) as its ORM, and as such, you will need to use the prisma CLI to facilitate any changes to the database schema.

Once you have made a change to `prisma.schema`, you can run the script `db:migrate` to generate a migration file. This script doesn't apply the migration, as Zipline handles applying migrations itself on startup.

```bash
pnpm db:migrate
```

If you wish to push changes to the database without generating a migration file, you can run the script `db:prototype`. This is only recommended for testing purposes, and should not be used in production.

```bash
pnpm db:prototype
```

#### Linting and Formatting

Zipline will fail to build unless the code is properly formatted and linted. To format the code, you can run the following command:

```bash
pnpm validate
```

#### Testing `zipline-ctl`

To build the ctl, you can run the following command:

```bash
pnpm build:server
```

then run any command you want

```bash
pnpm ctl help
```

# Documentation

Documentation is located at [zipline.diced.sh](https://zipline.diced.sh) and the source is located at [github.com/diced/zipline-docs](https://github.com/diced/zipline-docs).

# Security

Security issues are taken seriously, and should be reported via [GitHub Advisories](https://github.com/diced/zipline/security/advisories). For more information see the [security policy](SECURITY.md).
