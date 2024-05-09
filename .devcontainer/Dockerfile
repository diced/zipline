FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:0-18

RUN usermod -l zipline node \
    && groupmod -n zipline node \
    && usermod -d /home/zipline zipline \
    && echo "zipline ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers.d/zipline \
    && chmod 0440 /etc/sudoers.d/zipline

USER zipline