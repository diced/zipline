{
  inputs = {
    # required for some reason when entering the shell for devenv
    devenv-root = {
      url = "file+file:///dev/null";
      flake = false;
    };

    # node 24, postgres 17
    nixpkgs.url = "github:nixos/nixpkgs/812b3986fd1568f7a858f97fcf425ad996ba7d25";
    flake-parts.url = "github:hercules-ci/flake-parts";

    devenv.url = "github:cachix/devenv";
    devenv.inputs.nixpkgs.follows = "nixpkgs";
  };

  nixConfig = {
    extra-trusted-public-keys = "devenv.cachix.org-1:w1cLUi8dv3hnoSPGAuibQv+f9TZLr6cv/Hm9XgU50cw=";
    extra-substituters = "https://devenv.cachix.org";
  };

  outputs =
    inputs@{ flake-parts, devenv-root, ... }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      imports = [
        inputs.devenv.flakeModule
      ];

      systems = [
        "x86_64-linux"
        "x86_64-darwin"
        "aarch64-linux"
        "aarch64-darwin"
      ];

      perSystem =
        {
          config,
          self',
          inputs',
          pkgs,
          system,
          ...
        }:
        let
          psqlConfig = {
            username = "postgres";
            password = "postgres";
            database = "zipline";
          };
        in
        {
          devenv.shells.default = {
            packages = with pkgs; [
              git

              # to generate thumbnails
              ffmpeg

              # for testing docker
              docker
              docker-compose
            ];

            scripts = {
              pgup.exec = ''
                process-compose up postgres -D
              '';

              minioup.exec = ''
                process-compose up minio -D
              '';

              downall.exec = ''
                process-compose down
              '';
            };

            enterShell = ''
              export name="zipline-env";
              echo -e "\n[$name]: run 'pgup' to start services, 'downall' to stop services";
            '';

            languages.javascript = {
              enable = true;
              package = pkgs.nodejs_24;

              corepack.enable = true;
            };

            services = {
              postgres = {
                enable = true;
                package = pkgs.postgresql_17;

                initialScript = ''
                  CREATE ROLE "${psqlConfig.username}" WITH LOGIN PASSWORD '${psqlConfig.password}' SUPERUSER;
                '';

                initialDatabases = [
                  {
                    name = psqlConfig.database;
                    user = psqlConfig.username;
                  }
                ];

                listen_addresses = "0.0.0.0";
                port = 5432;
              };

              minio = {
                enable = true;
              };
            };

            process.managers.process-compose = {
              tui.enable = false;
            };
          };
        };
    };
}
