# Board – Real-Time Collaborative Whiteboard

A full-stack **real-time collaborative whiteboard application** that allows multiple users to create, edit, and collaborate on the same canvas simultaneously. Board supports live synchronization, multiplayer cursors, drawing tools, persistent boards, and role-based access.

---

## Features

* Real-time multi-user collaboration
* Live cursors and user presence
* Freehand drawing
* Rectangle, ellipse, arrow, and line tools
* Interactive text boxes
* Drag, move, and edit canvas elements
* Undo and redo with shared room history
* Zoom and pan controls
* Auto-save and persistent board storage
* Shareable board links
* Export boards as PNG
* Keyboard shortcuts
* Role-based viewer and editor access

---

## Tech Stack

* **Frontend:** Next.js 14, React, TypeScript
* **Styling:** Tailwind CSS
* **Canvas:** react-konva, Konva
* **Real-Time Collaboration:** Liveblocks
* **Authentication:** Clerk
* **Database:** PostgreSQL via Supabase
* **Communication:** Liveblocks Presence and Storage

---

## How It Works

Board follows a real-time collaborative architecture:

```text
User Interaction
      ↓
React + Konva Canvas
      ↓
Liveblocks Storage
      ↓
Real-Time Synchronization
      ↓
Connected Users
      ↓
Auto-Save
      ↓
Supabase PostgreSQL
```

Liveblocks manages the live collaborative state while Supabase stores persistent board data.

---

## Getting Started

### Prerequisites

* **Node.js 18+**
* **npm**
* Clerk account
* Liveblocks account
* Supabase account

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

Create a `.env.local` file:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

LIVEBLOCKS_SECRET_KEY=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### 4. Configure Supabase

Create a new Supabase project and run:

```text
supabase/schema.sql
```

in the SQL Editor.

Also create a public storage bucket named:

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
2. Use the toolbar to draw shapes, lines, arrows, or text.
3. Share the board link with collaborators.
4. Collaborate with multiple users in real time.
5. Use undo, redo, zoom, and pan controls.
6. Export the board as a PNG image.

---

## Project Structure

```text
board/
│
├── app/
│   ├── api/
│   ├── board/
│   └── page.tsx
│
├── components/
│   ├── BoardEditor.tsx
│   ├── Canvas.tsx
│   └── Toolbar.tsx
│
├── lib/
│   ├── types.ts
│   ├── liveblocks.config.ts
│   └── supabase.ts
│
├── supabase/
│   └── schema.sql
│
├── public/
├── .env.example
├── package.json
└── README.md
```

---

## License

This project is open-source and available for learning and personal projects.
