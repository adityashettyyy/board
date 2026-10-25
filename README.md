# Board — Real-Time Collaborative Whiteboard

[![CI](https://github.com/adityashettyyy/board/actions/workflows/ci.yml/badge.svg)](https://github.com/adityashettyyy/board/actions/workflows/ci.yml)

A full-stack whiteboard where multiple people draw on the same canvas at the same time, with live cursors, shareable links and per-board access control. Boards persist to Postgres, so they survive everyone leaving the room.

**Live demo:** _add your Vercel URL here_

<!-- Add a screenshot or GIF: ![Board demo](docs/demo.gif) -->

## Features

- Real-time multi-user editing with live cursors and presence avatars
- Pen, rectangle, ellipse, arrow, line, text and eraser tools
- Select, drag and delete elements; inline text editing (double-click)
- Per-user undo / redo
- Zoom (pinch / Ctrl + wheel), pan (scroll or hold Space)
- Auto-save to Postgres with a save-status indicator; board thumbnails on the dashboard
- **Sharing with roles:** the owner decides whether the link grants edit or view-only access
- Export the full board as PNG
- Keyboard shortcuts: `V` select · `P` pen · `R` rectangle · `O` ellipse · `A` arrow · `L` line · `T` text · `E` eraser · `⌘/Ctrl+Z` undo · `⌘/Ctrl+Shift+Z` redo · `Delete` remove

## Tech stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS |
| Canvas | Konva / react-konva |
| Realtime | Liveblocks (Storage + Presence) |
| Auth | Clerk |
| Database | Supabase Postgres + Storage |
| CI / Hosting | GitHub Actions / Vercel |

## Architecture

```text
Browser (React + Konva)
   │  mutations / cursors
   ▼
Liveblocks room ◄──────── /api/liveblocks-auth  (Clerk session + board membership
   │                       check → read-only or full-access token)
   │ debounced (1.5 s) full snapshot
   ▼
/api/boards/:id/elements ──► Supabase Postgres  (source of truth between sessions)
```

- **Liveblocks** holds the live state while people are connected; **Postgres** holds the durable copy.
- When the first person opens a board whose room is empty, the last Postgres snapshot is loaded into the room. Autosave is disabled until that load succeeds, so a failed or slow load can never overwrite a board with an empty one.
- Every API route authenticates with Clerk and checks `board_members` before reading or writing. Viewers receive read-only Liveblocks tokens and are rejected by the save endpoint.
- The service-role key is only used in server route handlers; RLS is enabled as defense in depth.

## Run locally

Requirements: Node 18+, and free accounts on Clerk, Liveblocks and Supabase.

```bash
git clone https://github.com/adityashettyyy/board.git
cd board
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

**Supabase setup**

1. Create a project and run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor. (It is safe to re-run on an existing project — it adds the `link_role` column if missing.)
2. Create a **public** storage bucket named `board-thumbnails`.

**Environment variables** (see [`.env.example`](.env.example))

| Variable | Where to get it |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Clerk dashboard → API keys |
| `LIVEBLOCKS_SECRET_KEY` | Liveblocks dashboard → API keys (secret) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project settings → API |

## Deploy to Vercel

1. Push this repo to GitHub, then **Add New → Project** in Vercel and import it (framework preset: Next.js, no build overrides).
2. Add every variable from the table above under **Settings → Environment Variables**.
3. Deploy. In Clerk, add your production domain under **Domains** (and switch to production keys if you use a Clerk production instance).
4. Open the live URL in two browsers, sign in as two users, and draw — cursors and strokes should appear in both.

CI (`.github/workflows/ci.yml`) runs typecheck and a production build on every push and pull request.

## Project structure

```text
app/
  api/boards/…          board CRUD, element snapshot save/load, thumbnails
  api/liveblocks-auth/  issues room tokens based on board role
  board/[boardId]/      board page (joins the user with the board's link role)
components/             Canvas, Toolbar, ShareMenu, TopBar, BoardEditor, …
hooks/                  keyboard shortcuts
lib/                    types, Liveblocks config, bounds + PNG export, Supabase clients
supabase/schema.sql     tables, indexes, RLS
```

## Roadmap

- Resize / rotate handles for selected elements
- Copy, paste, duplicate and z-order controls
- Member management (promote / remove collaborators)
- Rate limiting on the save endpoint

## License

MIT — see [LICENSE](LICENSE).
