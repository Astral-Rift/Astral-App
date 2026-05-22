FROM ghcr.io/ptero-eggs/steamcmd:debian

ENV SERVER_NAME=AstralServer
ENV ADMIN_USER=admin
ENV ADMIN_PASSWORD=changeme
ENV SERVER_PORT=16261
ENV STEAM_PORT=16262
ENV SRCDS_APPID=380870
ENV AUTO_UPDATE=1

USER root

RUN apt-get update && apt-get install -y \
    lib32gcc-s1 \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /server /server/steamcmd /home/container/.cache && \
    chmod -R 777 /server /home/container

WORKDIR /server

COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 16261/udp
EXPOSE 16262/udp

ENTRYPOINT ["/start.sh"]
