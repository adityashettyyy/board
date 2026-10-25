# Board – Real-Time Collaborative Whiteboard

A full-stack **real-time collaborative whiteboard** where multiple people draw on the same canvas at the same time. Board supports live cursors, shareable links with edit or view-only access, and auto-saved boards that persist after everyone leaves.

---

## Features

* Real-time multi-user collaboration
* Live cursors and user presence
* Pen, rectangle, ellipse, arrow, line, text and eraser tools
* Drag, select and delete canvas elements
* Inline text editing
* Per-user undo and redo
* Zoom and pan controls
* Auto-save to PostgreSQL with save status
* Shareable board links with edit or view-only access
* Board thumbnails on the dashboard
* Export boards as PNG
* Keyboard shortcuts

---

## Tech Stack

* **Frontend:** Next.js 14, React, TypeScript, Tailwind CSS
* **Canvas:** Konva, react-konva
* **Real-Time:** Liveblocks (Storage and Presence)
* **Authentication:** Clerk
* **Database:** PostgreSQL via Supabase
* **CI:** GitHub Actions

---

## How It Works

```text
User Interaction
      ↓
React + Konva Canvas
      ↓
Liveblocks Room
      ↓
Real-Time Sync to Connected Users
      ↓
Debounced Auto-Save
      ↓
Supabase PostgreSQL
```

Liveblocks holds the live state while people are connected, and PostgreSQL stores the durable copy. When a board is opened with an empty room, the last saved snapshot is loaded first, and auto-save stays disabled until that load succeeds. Every API route checks the Clerk session and board membership, and viewers receive read-only room access.

---

## Getting Started

### Prerequisites

* **Node.js 18+**
* **npm**
* Clerk, Liveblocks and Supabase accounts (free tiers work)

### 1. Clone the Repository

```bash
git clone https://github.com/adityashettyyy/board.git
cd board
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

LIVEBLOCKS_SECRET_KEY=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### 4. Configure Supabase

Create a Supabase project and run the contents of:

```text
supabase/schema.sql
```

in the SQL Editor. Then create a public storage bucket named:

```text
board-thumbnails
```

### 5. Start the Development Server

```bash
npm run dev
```

The application will run on:

`http://localhost:3000`

---

## How to Use

1. Sign in and create a board.
2. Pick a tool from the toolbar and draw, or press `T` to add text.
3. Click **Share**, choose edit or view-only access, and copy the link.
4. Open the link in another browser to collaborate in real time.
5. Use undo, redo, zoom and pan as needed.
6. Export the board as a PNG.

| Key | Action |
| --- | --- |
| `V` `P` `R` `O` `A` `L` `T` `E` | Select, pen, rectangle, ellipse, arrow, line, text, eraser |
| `Ctrl/⌘ + Z` | Undo |
| `Ctrl/⌘ + Shift + Z` | Redo |
| `Delete` | Remove selected element |
| `Space` + drag | Pan |

---

## Project Structure

```text
board/
│
├── app/
│   ├── api/
│   │   ├── boards/
│   │   └── liveblocks-auth/
│   ├── board/[boardId]/
│   └── page.tsx
│
├── components/
│   ├── Canvas.tsx
│   ├── BoardEditor.tsx
│   ├── Toolbar.tsx
│   ├── TopBar.tsx
│   └── ShareMenu.tsx
│
├── hooks/
├── lib/
│   ├── types.ts
│   ├── bounds.ts
│   ├── export-png.ts
│   ├── liveblocks.config.ts
│   └── supabase/
│
├── supabase/
│   └── schema.sql
│
├── .github/workflows/ci.yml
├── .env.example
├── package.json
└── README.md
```

---

## License

MIT License. See [LICENSE](LICENSE).
