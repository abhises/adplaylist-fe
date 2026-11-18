# Deploying the website

Production: `https://adplaylist.com` and `https://nl.adplaylist.com` (Dutch;
the app picks the language from the host) → AWS server `13.49.71.156`, user
`ubuntu`. `www.` and `www.nl.` redirect to the bare hosts in nginx. The API
is `https://api.adplaylist.com` on the same server (see adplaylist-be's
DEPLOY.md). The server also hosts another site (brasq) — never touch its
files or containers.

## How it runs

```
nginx 443 ── /etc/nginx/sites-available/adplaylist-web ──▶ 127.0.0.1:3010
  ~/adplaylist-web/docker-compose.yml   (compose project "adplaylist-web")
    adplaylist-web   image adplaylist-fe:<git sha>   (Next.js standalone)
  ~/adplaylist-web/.env                 WEB_TAG=<live image tag>
```

`NEXT_PUBLIC_*` values are build-time; their production values are the
`ARG` defaults in the `Dockerfile` (API URL, site URL, Google client id).

## CI/CD — `.github/workflows/deploy.yml`

- Pull requests: builds the image (a full `next build` incl. type check).
- Push to `main`: builds on GitHub, copies the image to the server, swaps the
  container, waits for its health check and **rolls back automatically** if
  it isn't healthy. Keeps the current + previous image.

Secrets (repo → Settings → Secrets and variables → Actions), same values as
the backend repo: `DEPLOY_SSH_HOST` = `13.49.71.156`, `DEPLOY_SSH_USER` =
`ubuntu`, `DEPLOY_SSH_KEY` = private key `~/.ssh/adplaylist_deploy`.

## Everyday commands (on the server, in `~/adplaylist-web`)

```bash
docker compose ps
docker compose logs -f --tail 100 web
# manual rollback:
docker images adplaylist-fe
sed -i 's/^WEB_TAG=.*/WEB_TAG=<tag>/' .env && docker compose up -d
```

TLS: `sudo certbot --nginx -d adplaylist.com -d www.adplaylist.com -d nl.adplaylist.com -d www.nl.adplaylist.com`
(renewed by certbot.timer).

Vercel hosted the site until November 2026.
