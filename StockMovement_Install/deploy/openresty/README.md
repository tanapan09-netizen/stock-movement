# OpenResty Custom 502/503/504

Use this when users currently see the default `502 Bad Gateway openresty` page and you want a friendlier message.

## Files

- `stock-movement.conf`: host-based OpenResty config (upstream `127.0.0.1:3002`)
- `stock-movement.docker.conf`: Docker compose OpenResty config (upstream `app:3000`)
- `errors/upstream-down.html`: custom browser page for upstream downtime

## Apply (Host OpenResty)

1. Copy `stock-movement.conf` to your OpenResty `conf.d` (or merge into existing server block).
2. Copy `errors/upstream-down.html` to:
   `/usr/local/openresty/nginx/html/errors/upstream-down.html`
3. Update upstream target in `stock-movement.conf`:
   - `server 127.0.0.1:3002;`
4. Validate and reload:

```bash
openresty -t
openresty -s reload
```

If your app serves HTTPS, apply the same `error_page` and proxy settings in the TLS (`listen 443 ssl`) server block too.

## Apply (Docker Compose)

Use with the existing app compose file:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.proxy.yml up -d
```

Default exposed proxy port is `8088`. You can change it with:

```bash
PROXY_PORT=80 docker compose -f docker-compose.prod.yml -f docker-compose.proxy.yml up -d
```
