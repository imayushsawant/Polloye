<p align="center">
  <img src="./public/polloye-logo-white.svg" alt="Polloye" width="320" />
</p>

<h1 align="center">Polloye</h1>

<p align="center">
  <strong>Live quiz platform — create, host, and join real-time quizzes.</strong>
</p>

<p align="center">
  🔗 <strong>Live:</strong> <a href="https://polloye.ayushsawant.dev">polloye.ayushsawant.dev</a>
</p>

<p align="center">
  <a href="https://github.com/imayushsawant/Polloye/actions"><img src="https://img.shields.io/badge/build-passing-brightgreen" alt="Build Status" /></a>
  <a href="https://github.com/imayushsawant/Polloye"><img src="https://img.shields.io/badge/version-0.1.0-blue" alt="Version" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="License: MIT" /></a>
</p>

---

## 📖 Description

Polloye is a Kahoot-style live quiz platform for educators, event hosts, and teams who want fast, interactive sessions in the browser. Create quizzes with timed questions, share them with a short code, host a live session over WebSockets, and let participants join with an account or a nickname. After each round, hosts and players can review scores and response analytics.

It solves the friction of spinning up engaging live polls without heavy desktop tools — everything runs as a modern web app with a separate realtime server for low-latency play.

**Who it’s for:** Teachers, facilitators, meetup organizers, and anyone running classroom or team quizzes.

---

## ✨ Key Features

- **Quiz Builder** — Create quizzes with MCQ, multi-select (MSQ), and true/false questions. Includes customizable scoring and optional images.
- **Per-Question Timers** — Granular control over the time limit for every individual question.
- **Live Hosting & Realtime Play** — Socket.IO-powered low-latency gameplay. Start a session, share a 6-character code, and control the flow from a host view.
- **Flexible Authentication** — Email/password & OAuth (Google/GitHub) support via [Better Auth](https://www.better-auth.com/), complete with a secure "Forgot Password" flow.
- **Guest & Account Play** — Join with a nickname as a guest, or sign in for history across sessions.
- **Results & Analytics** — Review session results with rich charts (bar, pie, donut) via Recharts. Includes **Attendance Time-Window Analytics** to track player participation.
- **Daily Notes** — Built-in daily notes feature for organizers and users.
- **Share & Import** — Share quizzes via a unique sharing code; others can clone into their library.
- **Dashboard** — Your quizzes, conducted sessions, and participated history in one place.
- **Media Uploads** — Question and option images powered by Cloudflare R2 (S3-compatible).
- **LAN-friendly Dev** — Optional same-Wi-Fi setup so phones can join a laptop-hosted session during development.

---

## 🛠 Tech Stack

| Layer | Technology |
| --- | --- |
| **Framework** | [Next.js](https://nextjs.org/) 16 (App Router) |
| **Language** | TypeScript |
| **UI** | React 19, Tailwind CSS 4 |
| **Auth** | Better Auth, Resend (Emails) |
| **Database** | PostgreSQL 16, Prisma ORM |
| **Realtime** | Socket.IO (`ws-server/`) |
| **Validation** | Zod |
| **Charts** | Recharts |
| **Object Storage** | Cloudflare R2 (`@aws-sdk/client-s3`) |
| **Local DB** | Docker Compose |

---

## 🚀 Getting Started

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

### 4. Configure Environment Variables

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

> **Note:** Use the **same** `WS_JWT_SECRET` and `WS_INTERNAL_SECRET` values in the root `.env`. See [Configuration](#configuration) for the full variable list.

### 5. Database Setup

Generate Prisma client and run migrations:

```bash
npm run db:generate
npm run db:migrate
```

You’re ready to run the app!

---

## 💻 Usage

### Local Development (Laptop only)

Start the Next.js app and the WebSocket server in two separate terminals:

```bash
# Terminal 1: Next.js Frontend
npm run dev

# Terminal 2: WebSocket Server
npm run dev:ws
```

Then open [http://localhost:3000](http://localhost:3000).

1. Register or sign in at `/register` / `/login`
2. Create a quiz at `/create-quiz`
3. From the dashboard, start a session and open the **host** view
4. On another browser (or device), join with the session code
5. Host advances questions; players answer in realtime
6. View results when the session ends

### Development (Phone + Laptop on the same Wi‑Fi)

1. Find your laptop’s LAN IPv4 (e.g., `ipconfig` on Windows, `ifconfig` on Mac/Linux)
2. Point `BETTER_AUTH_URL` and `NEXT_PUBLIC_WS_URL` at that IP (see comments in `.env.example`)
3. Set `ws-server/.env` `CORS_ORIGIN` to the same origin
4. Run:

```bash
npm run dev:lan
npm run dev:ws
```

Open `http://<your-lan-ip>:3000` on your phone and laptop (HTTP, not HTTPS). Ensure your firewall allows TCP **3000** and **3001**.

### Production-style Local Run

```bash
npm run build
npm run start
```

Keep `npm run dev:ws` (or a process manager for `ws-server`) running alongside the Next.js server.

---

## ⚙️ Configuration

Environment variables are documented in [`.env.example`](./.env.example). Core ones include:

| Variable | Location | Purpose |
| --- | --- | --- |
| `BETTER_AUTH_SECRET` | Root `.env` | Auth signing secret |
| `BETTER_AUTH_URL` | Root `.env` | Public app origin (e.g., `http://localhost:3000`) |
| `DATABASE_URL` | Root & `ws-server` | PostgreSQL connection string |
| `WS_JWT_SECRET` | Root & `ws-server` | JWT secret for Socket.IO auth (must match) |
| `WS_INTERNAL_SECRET` | Root & `ws-server` | Secret for Next → WS internal calls (must match) |
| `NEXT_PUBLIC_WS_URL` | Root `.env` | Browser-facing WS URL |
| `R2_*` | Root `.env` | Cloudflare R2 credentials and public URL for media |

> ⚠️ **Security Warning:** Do not commit real secrets, production URLs, or LAN IPs.

---

## 🌍 Deployment (VPS / Production)

Polloye is designed to be easily deployed on a Linux Virtual Private Server (VPS) such as an Azure Linux VM. The live instance runs at [https://polloye.ayushsawant.dev](https://polloye.ayushsawant.dev).

### Production Architecture
- **Database**: PostgreSQL running in an isolated Docker container.
- **Process Manager**: PM2 running both the Next.js frontend (port `3000`) and the WebSocket server (port `3001`).
- **Reverse Proxy**: Caddy server handling automatic SSL and routing HTTPS traffic.
  - `/socket.io/*` routes to `127.0.0.1:3001`
  - Everything else routes to `127.0.0.1:3000`
- **Media Storage**: Cloudflare R2 bucket securely holding all user-uploaded question and option images.

---

## 📂 Project Structure

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

## 🤝 Contributing

Contributions are welcome! A practical flow:

1. Fork the repo (or create a branch if you have write access)
2. Create a feature branch: `git checkout -b feature/your-change`
3. Install deps, run DB + both servers, and verify your flow locally
4. Keep changes focused; match existing TypeScript, UI, and API patterns
5. Run `npm run lint` before opening a PR
6. Open a pull request with a short summary of **why** the change exists and how to test it

For bugs, include steps to reproduce, expected vs actual behavior, and relevant env/setup notes (without secrets).

---

## 📄 License

This project is open source and available under the [MIT License](./LICENSE).
