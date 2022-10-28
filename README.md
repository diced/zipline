<div align="center">
  <img src="https://raw.githubusercontent.com/diced/zipline/trunk/public/zipline_small.png"/>

A ShareX/file upload server that is easy to use, packed with features, and with an easy setup!

![Stars](https://img.shields.io/github/stars/diced/zipline?logo=github&style=flat)
![Version](https://img.shields.io/github/package-json/v/diced/zipline?logo=git&logoColor=white&style=flat)
![GitHub last commit (branch)](https://img.shields.io/github/last-commit/diced/zipline/trunk?logo=git&logoColor=white&style=flat)
[![Discord](https://img.shields.io/discord/729771078196527176?color=%23777ed3&label=discord&logo=discord&logoColor=white&style=flat)](https://discord.gg/EAhCRfGxCF)

![Build](https://img.shields.io/github/workflow/status/diced/zipline/Build?logo=github&style=flat)
[![Docker Image (trunk)](https://img.shields.io/github/workflow/status/diced/zipline/Push%20Docker%20Images?label=Docker%20%28trunk%29&logo=github&style=flat)](https://github.com/diced/zipline/pkgs/container/zipline/?tag=trunk)
[![Docker Image (release)](https://img.shields.io/github/workflow/status/diced/zipline/Push%20Release%20Docker%20Images?label=Docker%20%28release%29&logo=github&style=flat)](https://github.com/diced/zipline/pkgs/container/zipline/?tag=latest)

</div>

## Features

- Configurable
- Fast
- Built with Next.js & React
- Token protected uploading
- Image uploading
- Image compression
- Password Protected Uploads
- URL shortening
- Text uploading
- URL Formats (uuid, dates, random alphanumeric, original name, zws)
- Discord embeds (OG metadata)
- Gallery viewer, and multiple file format support
- Code highlighting
- Fully customizable Discord webhook notifications
- OAuth2 registration (Discord and GitHub)
- User invites
- File Chunking (for large files)
- File deletion once it reaches a certain amount of views
- Easy setup instructions on [docs](https://zipl.vercel.app/) (One command install `docker-compose up -d`)

<details>
  <summary><h2>Screenshots (click)</h2></summary>
  
  View full album at [imgur](https://imgur.com/a/GzyowZ7)
  
  ![Login Page](https://i.imgur.com/14Er7qt.png)
  ![Dashboard](https://i.imgur.com/3JK5bp6.png)
  ![Files Page](https://i.imgur.com/grIaDs8.png)
</details>

# Usage

## Install & run with Docker

This section requires [Docker](https://docs.docker.com/get-docker/) and [docker-compose](https://docs.docker.com/compose/install/).

```shell
git clone https://github.com/diced/zipline
cd zipline

docker-compose up -d
```

### After installing

After installing, please edit the `docker-compose.yml` file and find the line that says `SECRET=changethis` and replace `changethis` with a random string.
Ways you could generate the string could be from a password managers generator, or you could just slam your keyboard and hope for the best.

## Building & running from source

This section requires [nodejs](https://nodejs.org), [yarn](https://yarnpkg.com/) or [npm](https://npmjs.com).

```shell
git clone https://github.com/diced/zipline
cd zipline

# npm install
yarn install
# npm run build
yarn build
# npm start
yarn start
```

# NGINX Proxy

This section requires [NGINX](https://nginx.org/).

```nginx
server {
  listen 80 default_server;
  client_max_body_size 100M;
  server_name <your domain (optional)>;
  location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

# Website

The default port is `3000`, once you have accessed it you can see a login screen. The default credentials are "administrator" and "password". Once you login please immediately change the details to something more secure. You can do this by clicking on the top right corner where it says "administrator" with a gear icon and clicking Manage Account.

# ShareX (Windows)

This section requires [ShareX](https://www.getsharex.com/).

After navigating to Zipline, click on the top right corner where it says your username and click Manage Account. Scroll down to see "ShareX Config", select the one you would prefer using. After this you can import the .sxcu into sharex. [More information here](https://zipl.vercel.app/docs/guides/uploaders/sharex)

# Flameshot (Linux)

This section requires [Flameshot](https://www.flameshot.org/), [jq](https://stedolan.github.io/jq/), and [xsel](https://github.com/kfish/xsel).

You can either use the script below, or generate one directly from Zipline (just like how you can generate a ShareX config).
To upload files using flameshot we will use a script. Replace $TOKEN and $HOST with your own values, you probably know how to do this if you use linux.

```shell
DATE=$(date '+%h_%Y_%d_%I_%m_%S.png');
flameshot gui -r > ~/Pictures/$DATE;

curl -H "Content-Type: multipart/form-data" -H "authorization: $TOKEN" -F file=@$1 $HOST/api/upload | jq -r 'files[0].url' | xsel -ib
```

# Contributing

## Bug reports

Create an issue on GitHub, please include the following (if one of them is not applicable to the issue then it's not needed):

- The steps to reproduce the bug
- Logs of Zipline
- The version of Zipline
- Your OS & Browser including server OS
- What you were expecting to see

## Feature requests

Create an issue on GitHub, please include the following:

- Breif explanation of the feature in the title (very breif please)
- How it would work (detailed, but optional)

## Pull Requests (contributions to the codebase)

Create a pull request on GitHub. If your PR does not pass the action checks, then please fix the errors. If your PR was submitted before a release, and I have pushed a new release, please make sure to update your PR to reflect any changes, usually this is handled by GitHub.
