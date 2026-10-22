{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";

    devenv.url = "github:cachix/devenv";
    devenv.inputs.nixpkgs.follows = "nixpkgs";
  };

  nixConfig = {
    extra-trusted-public-keys = "devenv.cachix.org-1:w1cLUi8dv3hnoSPGAuibQv+f9TZLr6cv/Hm9XgU50cw=";
    extra-substituters = "https://devenv.cachix.org";
  };

  outputs =
    inputs@{ nixpkgs, devenv, ... }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
      ];
      psqlConfig = {
        username = "postgres";
        password = "postgres";
        database = "zipline";
      };
    in
    {
      devShells = nixpkgs.lib.genAttrs systems (system: {
        default = devenv.lib.mkShell {
          inherit inputs;
          pkgs = nixpkgs.legacyPackages.${system};
          modules = [
            ({ pkgs, ... }: {
              packages = with pkgs; [
                git
                corepack

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
                package = pkgs.nodejs_26;

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
              };

              process.managers.process-compose = {
                tui.enable = false;
              };
            })
          ];
        };
      });
    };
}
