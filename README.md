# Polloye

**Live quiz platform — create, host, and join real-time quizzes.**

🔗 **Live Deployment:** [https://polloye.ayushsawant.dev](https://polloye.ayushsawant.dev)

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/imayushsawant/Polloye/actions)
[![Version](https://img.shields.io/badge/version-0.1.0-blue)](https://github.com/imayushsawant/Polloye)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

---

## Description

Polloye is a Kahoot-style live quiz platform for educators, event hosts, and teams who want fast, interactive sessions in the browser. Create quizzes with timed questions, share them with a short code, host a live session over WebSockets, and let participants join with an account or a nickname. After each round, hosts and players can review scores and response analytics.

It solves the friction of spinning up engaging live polls without heavy desktop tools — everything runs as a modern web app with a separate realtime server for low-latency play.

**Who it’s for:** teachers, facilitators, meetup organizers, and anyone running classroom or team quizzes.

---

## Key Features

- **Quiz builder** — Create quizzes with MCQ, multi-select (MSQ), and true/false questions, scoring, timers, and optional images
- **Live hosting** — Start a session, share a 6-character session code, and control the flow from a host view
- **Realtime play** — Socket.IO-powered participant joins, answers, and live tallies
- **Guest & account play** — Join with a nickname as a guest, or sign in for history across sessions
- **Share & import** — Share quizzes via a unique sharing code; others can clone into their library
- **Results & analytics** — Session results with charts (bar, pie, donut) via Recharts
- **Dashboard** — Your quizzes, conducted sessions, and participated history in one place
- **Auth** — Email/password authentication with [Better Auth](https://www.better-auth.com/)
- **Media uploads** — Question and option images via Cloudflare R2 (S3-compatible)
- **Onboarding** — First-run walkthrough for new hosts
- **LAN-friendly dev** — Optional same-Wi-Fi setup so phones can join a laptop-hosted session

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | [Next.js](https://nextjs.org/) 16 (App Router) |
| Language | TypeScript |
| UI | React 19, Tailwind CSS 4 |
| Auth | Better Auth |
| Database | PostgreSQL 16, Prisma ORM |
| Realtime | Socket.IO (`ws-server/`) |
| Validation | Zod |
| Charts | Recharts |
| Object storage | Cloudflare R2 (`@aws-sdk/client-s3`) |
| Local DB | Docker Compose |

---

## Prerequisites & Installation

### Prerequisites

- **Node.js** 20+ (recommended)
- **npm** (lockfile is npm-based)
- **Docker** (for local PostgreSQL)
- A **Cloudflare R2** bucket if you want image uploads locally (optional for core flows)

### 1. Clone the repository

```bash
git clone https://github.com/imayushsawant/Polloye.git
cd Polloye
```

### 2. Install dependencies

```bash
npm install
npm install --prefix ws-server
```

### 3. Start PostgreSQL

```bash
npm run db:up
```

This starts Postgres on `localhost:5432` with user/password/db `polloye` (see `docker-compose.yml`).

### 4. Configure environment variables

Copy the example env file and fill in secrets:

```bash
cp .env.example .env
```

Create `ws-server/.env` with at least:

```bash
DATABASE_URL="postgresql://polloye:polloye@localhost:5432/polloye?schema=public"
WS_JWT_SECRET="replace-with-ws-jwt-secret"
WS_INTERNAL_SECRET="replace-with-ws-internal-secret"
CORS_ORIGIN=http://localhost:3000
WS_PORT=3001
```

Use the **same** `WS_JWT_SECRET` and `WS_INTERNAL_SECRET` values in the root `.env`. See [Configuration](#configuration) for the full variable list.

### 5. Generate Prisma client and run migrations

```bash
npm run db:generate
npm run db:migrate
```

You’re ready to run the app.

---

## Deployment (VPS / Production)

Polloye is designed to be easily deployed on a Linux Virtual Private Server (VPS) such as an Azure Linux VM. The live instance runs at [https://polloye.ayushsawant.dev](https://polloye.ayushsawant.dev).

### Production Architecture
- **Database**: PostgreSQL running in an isolated Docker container.
- **Process Manager**: PM2 running both the Next.js frontend (port `3000`) and the WebSocket server (port `3001`).
- **Reverse Proxy**: Caddy server handling automatic SSL and routing HTTPS traffic.
  - `/socket.io/*` routes to `127.0.0.1:3001`
  - Everything else routes to `127.0.0.1:3000`
- **Media Storage**: Cloudflare R2 bucket securely holding all user-uploaded question and option images.

### Quick Deployment Steps
1. SSH into your VPS and install dependencies (Node.js, Docker, PM2, Caddy, Git).
2. Clone the repository and configure both `.env` files (root and `ws-server`).
3. Run `sudo docker compose up -d` for the DB, then run Prisma migrations (`npx prisma migrate deploy`).
4. Build the application (`npm run build`).
5. Start processes using PM2:
   ```bash
   pm2 start npm --name "polloye-web" -- start
   cd ws-server && pm2 start npm --name "polloye-ws" -- start
   ```
6. Point your domain A-record to your VPS IP.
7. Configure Caddy (`/etc/caddy/Caddyfile`) with your domain to handle SSL and proxying, then restart Caddy.

---

## Usage

### Development (laptop only)

Start the Next.js app and the WebSocket server in two terminals:

```bash
npm run dev
```

```bash
npm run dev:ws
```

Then open [http://localhost:3000](http://localhost:3000).

1. Register or sign in at `/register` / `/login`
2. Create a quiz at `/create-quiz`
3. From the dashboard, start a session and open the **host** view
4. On another browser (or device), join with the session code
5. Host advances questions; players answer in realtime
6. View results when the session ends

### Development (phone + laptop on the same Wi‑Fi)

1. Find your laptop’s LAN IPv4 (`ipconfig` on Windows)
2. Point `BETTER_AUTH_URL` and `NEXT_PUBLIC_WS_URL` at that IP (see comments in `.env.example`)
3. Set `ws-server/.env` `CORS_ORIGIN` to the same origin
4. Run:

```bash
npm run dev:lan
```

```bash
npm run dev:ws
```

Open `http://<your-lan-ip>:3000` on phone and laptop (HTTP, not HTTPS). Ensure Windows Firewall allows TCP **3000** and **3001**.

### Production-style local run

```bash
npm run build
npm run start
```

Keep `npm run dev:ws` (or a process manager for `ws-server`) running alongside the Next.js server.

### Useful scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run dev:lan` | Next.js bound to `0.0.0.0:3000` for LAN access |
| `npm run dev:ws` | WebSocket server (tsx watch) |
| `npm run build` / `npm run start` | Production build & start |
| `npm run lint` | ESLint |
| `npm run db:up` / `npm run db:down` | Start/stop Postgres via Docker |
| `npm run db:studio` | Prisma Studio |

---

## Configuration

Environment variables are documented in [`.env.example`](./.env.example). Core ones:

| Variable | Where | Purpose |
| --- | --- | --- |
| `BETTER_AUTH_SECRET` | Root `.env` | Auth signing secret |
| `BETTER_AUTH_URL` | Root `.env` | Public app origin (e.g. `http://localhost:3000`) |
| `DATABASE_URL` | Root + `ws-server` | PostgreSQL connection string |
| `WS_JWT_SECRET` | Root + `ws-server` | JWT secret for Socket.IO auth (must match) |
| `WS_INTERNAL_SECRET` | Root + `ws-server` | Secret for Next → WS internal calls (must match) |
| `WS_SERVER_URL` | Root `.env` | Server-side URL to the WS process (usually `http://localhost:3001`) |
| `NEXT_PUBLIC_WS_URL` | Root `.env` | Browser-facing WS URL |
| `CRON_SECRET` | Root `.env` | Protects cron cleanup routes |
| `R2_*` | Root `.env` | Cloudflare R2 credentials and public URL for media |
| `CORS_ORIGIN` | `ws-server/.env` | Allowed browser origin for Socket.IO |
| `WS_PORT` | `ws-server/.env` | WS listen port (default `3001`) |

**Do not commit** real secrets, production URLs, or LAN IPs.

---

## Project structure (high level)

```text
polloye/
├── app/                 # Next.js App Router (pages + API routes)
├── components/          # UI, nav, live quiz components
├── lib/                 # Auth, Prisma, validations, WS helpers
├── prisma/              # Schema & migrations
├── ws-server/           # Standalone Socket.IO realtime server
├── docker-compose.yml   # Local PostgreSQL
└── .env.example         # Env template + LAN notes
```

---

## Contributing

Contributions are welcome. A practical flow:

1. Fork the repo (or create a branch if you have write access)
2. Create a feature branch: `git checkout -b feature/your-change`
3. Install deps, run DB + both servers, and verify your flow locally
4. Keep changes focused; match existing TypeScript, UI, and API patterns
5. Run `npm run lint` before opening a PR
6. Open a pull request with a short summary of **why** the change exists and how to test it

For bugs, include steps to reproduce, expected vs actual behavior, and relevant env/setup notes (without secrets).

---

## License

This project is open source and available under the [MIT License](./LICENSE).
