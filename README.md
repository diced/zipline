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
      7. Particles.JS
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

- MariaDB
- MySQL
- PostgreSQL
- CockroachDB
- Microsoft SQL Server
- MongoDB (Coming soon!)

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
| ------------------- | ------- | ------------------------------------------------------------ |
| `upload.fileLength` | integer | how long the random id for a file should be                  |
| `upload.tempDir`    | string  | temporary directory, files are stored here and then deleted. |
| `upload.uploadDir`  | string  | upload directory (where all uploads are stored)              |

#### Site Settings

**Config Property:** `site`

| Config Property | Type    | Description / Expected Values                          |
| --------------- | ------- | ------------------------------------------------------ |
| `site.protocol` | integer | protocol (http or https)                               |
| `site.domain`   | string  | domain of server (ex. `localhost:8080`, `example.com`) |

#### SSL Settings

**Config Property:** `ssl`

| Config Property | Type   | Description / Expected Values                   |
| --------------- | ------ | ----------------------------------------------- |
| `ssl.key`       | string | path to ssl private key. ex: `./ssl/server.key` |
| `ssl.cert`      | string | path to ssl certificate. ex: `./ssl/cert.crt`   |

#### Administrator User

**Config Property:** `administrator`

| Config Property               | Type   | Description / Expected Values                                                                            |
| ----------------------------- | ------ | -------------------------------------------------------------------------------------------------------- |
| `administrator.password`      | string | password of administrator user (NOT RECOMENDED to use administrator user, set this to a SECURE password) |
| `administrator.authorization` | string | authorization token that could be used for uploading (NOT RECOMENDED, set this to a SECURE master token) |

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

#### Ports

**Config Property:** `http_port`

Port to run the http server on

**Config Property:** `https_port`

Port to run the https server on

#### Meta Configuration

**Config Property:** `meta`

Particles.JS, can be enabled and it's config can be changed willingly.

| Config Property | Type   | Description / Expected Values                                                                |
| --------------- | ------ | -------------------------------------------------------------------------------------------- |
| `meta.favicon`  | string | has to be in /public/assets folder and should be formatted as `"/public/assets/<file name>"` |
| `meta.title`    | string | title of your server shows up like `<title> - Login` or `<title> - Dashboard`                |

#### Particles.JS Configuration

**Config Property:** `particles`

Particles.JS, can be enabled and it's config can be changed willingly.

| Config Property     | Type            | Description / Expected Values                                                                                                |
| ------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `particles.enabled` | boolean         | Whether particles should show up on routes                                                                                   |
| `particles.config`  | particlesconfig | Config from [this](https://vincentgarreau.com/particles.js/) play around with the configuration, then paste the json to here |

### Example Config

```json
{
  "upload": {
    "fileLength": 6,
    "tempDir": "./temp",
    "uploadDir": "./uploads"
  },
  "meta": {
    "favicon": "/public/assets/typex_small.png",
    "title": "TypeX"
  },
  "site": {
    "protocol": "https",
    "ssl": {
      "key": "./ssl/server.key",
      "cert": "./ssl/server.crt"
    },
    "https_port": 443,
    "http_port": 80
  },
  "administrator": {
    "password": "1234",
    "authorization": "Administrator 1234"
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
    "entities": ["out/src/entities/**/*.js"]
  },
  "sessionSecret": "qwertyuiopasdfghjklzxcvbnm",
  "port": 8000,
  "particles": {
    "enabled": true,
    "settings": {
      "particles": {
        "number": {
          "value": 52,
          "density": {
            "enable": true,
            "value_area": 800
          }
        },
        "color": {
          "value": "#cd4c4c"
        },
        "shape": {
          "type": "circle",
          "stroke": {
            "width": 0,
            "color": "#000000"
          },
          "polygon": {
            "nb_sides": 9
          },
          "image": {
            "src": "img/github.svg",
            "width": 60,
            "height": 100
          }
        },
        "opacity": {
          "value": 0.5,
          "random": false,
          "anim": {
            "enable": false,
            "speed": 1,
            "opacity_min": 0.1,
            "sync": false
          }
        },
        "size": {
          "value": 0,
          "random": true,
          "anim": {
            "enable": false,
            "speed": 40,
            "size_min": 0.1,
            "sync": false
          }
        },
        "line_linked": {
          "enable": true,
          "distance": 150,
          "color": "#ffffff",
          "opacity": 0.4,
          "width": 1
        },
        "move": {
          "enable": true,
          "speed": 6,
          "direction": "none",
          "random": false,
          "straight": false,
          "out_mode": "out",
          "bounce": false,
          "attract": {
            "enable": false,
            "rotateX": 600,
            "rotateY": 1200
          }
        }
      },
      "interactivity": {
        "detect_on": "canvas",
        "events": {
          "onhover": {
            "enable": false,
            "mode": "grab"
          },
          "onclick": {
            "enable": false,
            "mode": "repulse"
          },
          "resize": true
        },
        "modes": {
          "grab": {
            "distance": 400,
            "line_linked": {
              "opacity": 1
            }
          },
          "bubble": {
            "distance": 400,
            "size": 40,
            "duration": 2,
            "opacity": 8,
            "speed": 3
          },
          "repulse": {
            "distance": 200,
            "duration": 0.4
          },
          "push": {
            "particles_nb": 4
          },
          "remove": {
            "particles_nb": 2
          }
        }
      },
      "retina_detect": true
    }
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
