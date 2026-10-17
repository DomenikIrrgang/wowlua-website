# syntax=docker/dockerfile:1

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 CI=1
# Base URL for page metadata and the RSS feed, baked into the prerendered pages.
ARG SITE_URL
# Which wowlua repository the docs come from.
ARG WOWLUA_REPO=DomenikIrrgang/wowlua
ENV SITE_URL=$SITE_URL WOWLUA_REPO=$WOWLUA_REPO
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# The prebuild step downloads wowlua's docs, spec and releases from GitHub
# (scripts/fetch-content.mjs). A token only raises the API rate limit; it is
# mounted for this step and never stored in a layer.
RUN --mount=type=secret,id=github_token,required=false \
    GITHUB_TOKEN="$(cat /run/secrets/github_token 2>/dev/null || true)" npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# The standalone output carries its own minimal node_modules and server.js;
# static assets and public/ are copied next to it. Every page is prerendered,
# so the content cache is not needed at run time.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

USER node
EXPOSE 3000
CMD ["node", "server.js"]
