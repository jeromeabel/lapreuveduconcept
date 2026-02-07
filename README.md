# La Preuve du Concept

A minimal French comics blog built with Astro 5, TypeScript, Tailwind CSS, and Astro DB (Turso).

## Features

- 🎨 **Comics Grid**: Landing page displaying all comics in a responsive grid
- 📖 **Two-Panel Display**: Individual comic pages showing two panels
- 👍 **Cookie-Based Voting**: Users can vote for their favorite comics (one vote per comic)
- 🗄️ **Astro DB**: Uses Turso for vote tracking and user management
- 📱 **Mobile-First**: Fully responsive design optimized for mobile devices
- 🎯 **TypeScript Strict**: Type-safe codebase with strict TypeScript settings
- 🚀 **Deploy-Ready**: Configured for Netlify deployment

## Tech Stack

- **Framework**: Astro 5
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 3
- **Database**: Astro DB (Turso/libSQL)
- **Adapter**: Netlify
- **Content**: Markdown with frontmatter

## Project Structure

```
src/
├── pages/
│   ├── index.astro              # Landing page with comics grid
│   ├── comics/[slug].astro      # Comic detail page
│   └── api/vote.ts              # Voting API endpoint
├── components/
│   ├── ComicPanel.astro         # Individual comic panel component
│   └── VoteButton.astro         # Vote button with state management
├── layouts/
│   └── Layout.astro             # Main layout component
└── content/
    ├── config.ts                # Content collection configuration
    └── comics/                  # Comic markdown files
        ├── le-debut.md
        ├── la-suite.md
        └── la-fin.md
db/
├── config.ts                    # Database schema
└── seed.ts                      # Database seeding

```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/jeromeabel/lapreuveduconcept.git
cd lapreuveduconcept

# Install dependencies
npm install
```

### Development

```bash
# Start the development server with local database
ASTRO_DATABASE_FILE=./.astro/data.db npm run dev
```

The site will be available at `http://localhost:4321`

### Building for Production

```bash
# Build with local database (for testing)
ASTRO_DATABASE_FILE=./.astro/data.db npm run build

# Build with remote database (for deployment)
npm run build -- --remote
```

### Database Management

```bash
# Push schema to remote database
npm run db:push

# Seed the database
npm run db:seed
```

## Content Management

Comics are stored as Markdown files in `src/content/comics/` with the following frontmatter:

```markdown
---
title: "Le Début"
author: "Jean Dupont"
date: 2024-01-15
panel1: "/images/placeholder-1.svg"
panel2: "/images/placeholder-2.svg"
description: "La première aventure commence ici"
---

# Comic content here
```

## Deployment

### Netlify

1. Connect your repository to Netlify
2. Set up environment variables:
   - `ASTRO_STUDIO_APP_TOKEN` (for production database)
3. Build command: `npm run build -- --remote`
4. Publish directory: `dist`

The `netlify.toml` file is already configured for deployment.

## Cookie-Based Voting

The voting system uses HTTP-only cookies to track user votes:

- Each user gets a unique cookie ID
- Votes are stored in the `Votes` table
- User voting history is stored in the `Users` table
- One vote per comic per user

## License

ISC

## Author

Jerome Abel
