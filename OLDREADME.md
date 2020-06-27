# TypeX

A TypeScript based Image/File uploading server. Fast and Elegant.

## Table of Contents

1. [Prerequisites](#prerequisites)
   1. [Node](#node--typescript)
   2. [Common Databases](#common-databases)
   3. [Installing Database Drivers](#installing-database-drivers)
      1. [PostgreSQL](#getting-postgresql-drivers)
      2. [CockroachDB](#getting-cockroachdb-drivers)
      3. [MySQL](#getting-mysql-drivers)
      4. [MariaDB](#getting-mariadb-drivers)
      5. [Microsoft SQL Server](#getting-microsoft-sql-drivers)
2. [Updating TypeX](#updating-typex)
3. [Installation](#installation)
   1. [Get the Source](#get-the-source--install-dependencies)
   2. [Setting up configurations](#configuration-options)
      1. [Upload Size](#upload)
      2. [User Settings](#user-settings)
      3. [Site Settings](#site-settings)
      4. [SSL Settings](#site-ssl-settings)
      5. [Administrator user](#administrator-user)
      6. [Database configuration](#database-configuration)
      7. [Session Secret](#session-secret)
      8. [Particles.JS](#meta-configuration)
   3. [Example Config](#example-config)
   4. [Compiling Source](#compiling-typescript-for-running)
   5. [Running Compiled Source](#running-compiled-source)

## Prerequisites

Dependencies needed for running TypeX

### Node & Typescript

Node.JS is what runs the show, and you will need it before anything else. Install it [here](https://nodejs.org)

Once Node is installed install Typescript by doing

```sh
npm i typescript -g
```

Verify your installation by running these commands

```sh
tsc -v
npm -v
node -v
```

They should all output something along the lines of

```sh
-> tsc -v
Version 3.8.3
-> npm -v
node 6.14.4
-> node -v
v13.13.0
```

### Common Databases

- [PostgreSQL](https://www.postgresql.org/ "PostgresSQL")
- [CockroachDB](https://www.cockroachlabs.com/ "Cockroach Labs")
- [MySQL](https://www.mysql.com/ "MySQL")
- [MariaDB](https://www.mariadb.com/ "MariaDB")
- [Microsoft SQL Server](https://www.microsoft.com/en-us/sql-server/ "Microsoft SQL Server")
- [MongoDB](https://www.mongodb.com/ "MongoDB") (Coming soon!)

(check out [this](https://github.com/typeorm/typeorm/blob/master/docs/connection-options.md) for all types, you will need to use a different ORM config later on, view [this](https://github.com/typeorm/typeorm/blob/master/docs/connection-options.md#common-connection-options) for every option, more on this on Database configuration setup step)

### Installing Database Drivers

In this installation step, you will be installing the drivers of your choice database.

#### Getting PostgreSQL Drivers

Run the following command in order to get PostgreSQL drivers

```sh
npm i pg --save-dev
```

#### Getting CockroachDB Drivers

Run the following command in order to get CockroachDB drivers

```sh
npm i cockroachdb --save-dev
```

#### Getting MySQL Drivers

Run the following command in order to get MySQL drivers

```sh
npm i mysql --save-dev
```

#### Getting MariaDB Drivers

Run the following command in order to get MariaDB drivers

```sh
npm i mariadb --save-dev
```

#### Getting Microsoft SQL Drivers

Run the following command in order to get Microsoft SQL drivers

```sh
npm i mssql --save-dev
```

## Updating TypeX

Updating TypeX, is very simple. You can use this one-liner to update and compile code.

1. Run the following in the `typex` directory, if there were config changes, you should change them before this command.

```sh
git pull && tsc -p .
```

2. After that, you just need to restart the process for changes to take effect.

## Installation

Now that you have considered what prerequisites you would like, lets actually install this! This installation is based on Linux systems, yet will work on both MacOSX and Windows with their respective commands

### Get the Source & Install Dependencies

```sh
git clone https://github.com/dicedtomatoreal/typex
cd typex
tsc -p .
npm start
```

### Configuration Options

Every single configuration option will be listed here

#### Upload

**Config Property:** `upload`

| Config Property     | Type    | Description / Expected Values                                |
| ------------------- | ------- | ------------------------------------------------------------ |
| `upload.fileLength` | integer | how long the random id for a file should be                  |
| `upload.tempDir`    | string  | temporary directory, files are stored here and then deleted. |
| `upload.uploadDir`  | string  | upload directory (where all uploads are stored)              |
| `upload.route`      | string  | Route for uploads, default is /u, ex.`/u/hd27ua.png`              |

#### User Settings

**Config Property:** `user`

| Config Property     | Type    | Description / Expected Values                                |
| ------------------- | ------- | ------------------------------------------------------------ |
| `user.tokenLength`  | integer | How long the randomly generated user token should be         |

#### Site Settings

**Config Property:** `site`

| Config Property | Type    | Description / Expected Values                          |
| --------------- | ------- | ------------------------------------------------------ |
| `site.protocol` | integer | protocol (http or https)                               |
| `site.serveHTTP`   | string  | Port to run the web server on with HTTP (can be used with nginx + CloudFlare as a reverse proxy and let CloudFlare take care of SSL) |
| `site.serveHTTPS`   | string  | Port to run the web server on with HTTPS (only will be used if `site.protocol` is `https`) (you will need SSL certificates! See [this](#site-ssl-settings)) |
| `site.logRoutes` | boolean | Wether or not to log routes when they are requested      |

#### Site SSL Settings

**Config Property:** `site.ssl`

| Config Property | Type   | Description / Expected Values                   |
| --------------- | ------ | ----------------------------------------------- |
| `site.ssl.key`       | string | path to ssl private key. ex: `./ssl/server.key` |
| `site.ssl.cert`      | string | path to ssl certificate. ex: `./ssl/cert.crt`   |

#### Administrator User

**Config Property:** `administrator`

| Config Property               | Type   | Description / Expected Values                                                                            |
| ----------------------------- | ------ | -------------------------------------------------------------------------------------------------------- |
| `administrator.password`      | string | password of administrator user (NOT RECOMENDED to use administrator user, set this to a SECURE password) |

#### Database Configuration

**Config Property:** `orm`

| Config Property   | Type     | Description / Expected Values                                                     |
| ----------------- | -------- | --------------------------------------------------------------------------------- |
| `orm.type`        | string   | `mariadb`, `mysql`, `postgres`, `cockroach`, `mssql`                              |
| `orm.host`        | string   | `localhost` or different IP                                                       |
| `orm.port`        | integer  | `5432` or different pot                                                           |
| `orm.username`    | string   | username                                                                          |
| `orm.password`    | string   | password                                                                          |
| `orm.database`    | string   | database to use                                                                   |
| `orm.synchronize` | boolean  | synchronize database to database, or not                                          |
| `orm.logging`     | boolean  | log all queries                                                                   |
| `orm.entities`    | string[] | entity paths (should not be edited, and should be `["out/src/entities/**/*.js"]`) |

#### Session Secret

**Config Property:** `sessionSecret`

A Random string of characters (anything)

#### Session Secret

**Config Property:** `saltRounds`

The ammount of salt rounds needed to salt a password! (used for password encryption)

#### Meta Configuration

**Config Property:** `meta`

Particles.JS, can be enabled and it's config can be changed willingly.

| Config Property | Type   | Description / Expected Values                                                                |
| --------------- | ------ | -------------------------------------------------------------------------------------------- |
| `meta.favicon`  | string | has to be in /public/assets folder and should be formatted as `"/public/assets/<file name>"` |
| `meta.title`    | string | title of your server shows up like `<title> - Login` or `<title> - Dashboard`                |


### Example Config

```json
{
    "upload": {
        "fileLength": 6,
        "tempDir": "./temp",
        "uploadDir": "./uploads",
        "route": "/u"
    },
    "shorten": {
        "idLength": 4,
        "route": "/s"
    },
    "user": {
        "tokenLength": 32
    },
    "site": {
        "protocol": "http",
        "returnProtocol": "https",
        "ssl": {
            "key": "./ssl/server.key",
            "cert": "./ssl/server.crt"
        },
        "serveHTTPS": 8000,
        "serveHTTP": 443,
        "logRoutes": true
    },
    "administrator": {
        "password": "1234"
    },
    "orm": {
        "type": "postgres",
        "host": "localhost",
        "port": 5432,
        "username": "user",
        "password": "1234",
        "database": "typex",
        "synchronize": true,
        "logging": false,
        "entities": [
            "out/src/entities/**/*.js"
        ]
    },
    "sessionSecret": "1234",
    "saltRounds": 10, // You might get an error if its over a certain number, so choose carefully.
    "meta": {
        "favicon": "/public/assets/typex_small_circle.png",
        "title": "TypeX"
    },
    "discordWebhook": {
        "enabled": true,
        "url": "https://canary.discordapp.com/api/webhooks/id/token",
        "username": "TypeX Logs",
        "avatarURL": "https://domain/public/assets/typex_small_circle.png"
    }
}
```

### Compiling Typescript for running

Compile the Typescript code before running the code, or you can run it with `ts-node` which is not recommended. **_MAKE SURE YOU ARE IN THE PROJECT DIR!_**

```sh
tsc -p .
```

### Running Compiled Source

Run the webserver by running

```sh
node out/src
```

## How you can upload

These are the options you must pass when uploading a url or image/file

### Uploader

| Property  | Value                               |
|-----------|-------------------------------------|
| URL       | `https://<DOMAIN>/api/upload`       |
| Header    | `authorization: <TOKEN>`            |
| Header    | `content-type: multipart/form-data` |
| File name | `file`                              |

### URL Shortener
| Property  | Value                               |
|-----------|-------------------------------------|
| URL       | `https://<DOMAIN>/api/shorten`      |
| Header    | `authorization: <TOKEN>`            |
| Header    | `content-type: application/json`    |
| Data      | `{"url": "<URL>"}`                  |
