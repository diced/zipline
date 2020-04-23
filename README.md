# TypeX

A TypeScript based Image/File uploading server. Fast and Elegant.

## Table of Contents

1. Prerequisites
    1. Node
    2. Common Databases
2. Installation
    1. Get the Source
    2. Setting up configurations
        1. Upload Size
        2. Site Settings
        3. Administrator user
        4. Database configuration
        5. Session Secret
        6. Web server port
    3. Example Config
    4. Compiling Source
    5. Running Compiled Source

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

* MariaDB
* MySQL
* PostgreSQL
* CockroachDB
* Microsoft SQL Server
* MongoDB (Coming soon!)

(check out [this](https://github.com/typeorm/typeorm/blob/master/docs/connection-options.md) for all types, you will need to use a different ORM config later on, view [this](https://github.com/typeorm/typeorm/blob/master/docs/connection-options.md#common-connection-options) for every option, more on this on Database configuration setup step)

## Installation

Now that you have considered what prerequisites you would like, lets actually install this! This installation is based on Linux systems, yet will work on both MacOSX and Windows with their respective commands

### Get the Source & Install Dependencies

You can get the source from the releases

```sh
wget <RELEASE TAR BALL>
tar -xvf <REALASE>
cd <REALASE>
npm i
```

### Configuration Options

Every single configuration option will be listed here

#### Upload

**Config Property:** `upload`

| Config Property     | Type    | Description / Expected Values                                |
|---------------------|---------|--------------------------------------------------------------|
| `upload.fileLength` | integer | how long the random id for a file should be                  |
| `upload.tempDir`    | string  | temporary directory, files are stored here and then deleted. |
| `upload.uploadDir`  | string  | upload directory (where all uploads are stored)              |

#### Site Settings

**Config Property:** `site`

| Config Property | Type    | Description / Expected Values                          |
|-----------------|---------|--------------------------------------------------------|
| `site.protocol` | integer | protocol (http or https)                               |
| `site.domain`   | string  | domain of server (ex. `localhost:8080`, `example.com`) |

#### Administrator User

**Config Property:** `administrator`

| Config Property               | Type   | Description / Expected Values                                                                            |
|-------------------------------|--------|----------------------------------------------------------------------------------------------------------|
| `administrator.password`      | string | password of administrator user (NOT RECOMENDED to use administrator user, set this to a SECURE password) |
| `administrator.authorization` | string | authorization token that could be used for uploading (NOT RECOMENDED, set this to a SECURE master token) |

#### Database Configuration

**Config Property:** `orm`

| Config Property   | Type     | Description / Expected Values                        |
|-------------------|----------|------------------------------------------------------|
| `orm.type`        | string   | `mariadb`, `mysql`, `postgres`, `cockroach`, `mssql` |
| `orm.host`        | string   | `localhost` or different IP                          |
| `orm.port`        | integer  | `5432` or different pot                              |
| `orm.username`    | string   | username                                             |
| `orm.password`    | string   | password                                             |
| `orm.database`    | string   | database to use                                      |
| `orm.synchronize` | boolean  | synchronize database to database, or not             |
| `orm.logging`     | boolean  | log all queries                                      |
| `orm.entities`    | string[] | entity paths (should not be edited, and should be `["out/src/entities/**/*.js"]`)                  |

#### Session Secret

**Config Property:** `sessionSecret`

A Random string of characters (anything)

#### Port

**Config Property:** `port`

Port to run the webserver on

### Example Config

```json
{
  "upload": {
    "fileLength": 6,
    "tempDir": "./temp",
    "uploadDir": "./uploads"
  },
  "site": {
    "protocol": "http",
    "domain": "localhost:8000"
  },
  "administrator": {
    "password": "1234",
    "authorization": "Administrator master"
  },
  "orm": {
    "type": "postgres",
    "host": "localhost",
    "port": 5432,
    "username": "postgres",
    "password": "password",
    "database": "typex",
    "synchronize": true,
    "logging": false,
    "entities": [
      "out/src/entities/**/*.js"
    ]
  },
  "sessionSecret": "aoshfyujfnbyurkjh53748uyfhn",
  "port": 8000
}
```

### Compiling Typescript for running

Compile the Typescript code before running the code, or you can run it with `ts-node` which is not recommended. ***MAKE SURE YOU ARE IN THE PROJECT DIR!***

```sh
tsc -p .
```

### Running Compiled Source

Run the webserver by running

```sh
node out/src
```
