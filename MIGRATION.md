# Migration from Vite + Express to Next.js

## Overview

This document describes the migration of the Musicgy project from a Vite + Express architecture to Next.js.

## What Changed

### Architecture
- **Before**: Separate Vite frontend (port 3000) + Express backend (port 3001)
- **After**: Unified Next.js application (single port)

### Key Changes

1. **Frontend**
   - Moved from Vite to Next.js with App Router
   - React components remain mostly unchanged
   - Added `'use client'` directive to main page component
   - Migrated styles from `index.html` to `app/globals.css`

2. **Backend**
   - Express routes (`routes.ts`) → Next.js API Routes (`app/api/*/route.ts`)
   - All API logic preserved in service files (`services/netease.ts`, `services/room.ts`)
   - Each Express route became a separate Next.js API route file

3. **Configuration**
   - `vite.config.ts` → `next.config.js`
   - Updated `tsconfig.json` for Next.js
   - Added `tailwind.config.js` and `postcss.config.js`
   - Package scripts updated for Next.js commands

4. **Dependencies**
   - Added: `next`, `@types/react`, `@types/react-dom`
   - Kept: All React and music API dependencies
   - Removed: Vite-specific dependencies (will be in devDependencies but unused)

## File Mapping

### Deleted Files (Old Architecture)
- `App.tsx` → Moved to `app/page.tsx`
- `index.tsx` → Entry point now handled by Next.js
- `index.html` → Layout now in `app/layout.tsx`
- `api.ts` → Moved to `lib/api.ts`
- `routes.ts` → Split into individual API routes
- `server.ts` → No longer needed (Next.js handles server)
- `server.production.ts` → No longer needed
- `vite.config.ts` → Replaced by `next.config.js`
- `start.js` → No longer needed
- `deploy.bat`, `deploy.sh` → Deployment is simpler with Next.js

### New Files (Next.js)
- `app/page.tsx` - Main page (client component)
- `app/layout.tsx` - Root layout
- `app/globals.css` - Global styles
- `app/api/*/route.ts` - API routes (14 routes total)
- `lib/api.ts` - Frontend API client
- `next.config.js` - Next.js configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `postcss.config.js` - PostCSS configuration

### Unchanged Files
- `components/*` - All React components (only import paths updated)
- `services/*` - All service logic (only import paths updated)
- `metadata.json` - Project metadata
- `README.md` - Updated with Next.js instructions
- `.gitignore` - Updated for Next.js build artifacts

## API Routes Migration

Each Express route was converted to a Next.js API route:

| Express Route | Next.js API Route |
|--------------|-------------------|
| `GET /api/state` | `app/api/state/route.ts` |
| `GET /api/search` | `app/api/search/route.ts` |
| `POST /api/queue` | `app/api/queue/route.ts` |
| `POST /api/vote-skip` | `app/api/vote-skip/route.ts` |
| `POST /api/join` | `app/api/join/route.ts` |
| `POST /api/leave` | `app/api/leave/route.ts` |
| `POST /api/heartbeat` | `app/api/heartbeat/route.ts` |
| `GET /api/cover` | `app/api/cover/route.ts` |
| `GET /api/stream` | `app/api/stream/route.ts` |
| `GET /api/auth/key` | `app/api/auth/key/route.ts` |
| `POST /api/auth/create` | `app/api/auth/create/route.ts` |
| `POST /api/auth/check` | `app/api/auth/check/route.ts` |
| `GET /api/auth/status` | `app/api/auth/status/route.ts` |

## Technical Considerations

### Webpack vs Turbopack
The project uses webpack instead of the default Turbopack because the `@neteasecloudmusicapienhanced/api` package uses dynamic requires that are not compatible with Turbopack. The `next.config.js` externalizes this package for server-side rendering.

### Runtime Configuration
All API routes that use the netease service or room service include:
```typescript
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
```
This ensures they run in the Node.js runtime and are not statically generated.

### Import Paths
- Changed from `.js` extensions to no extension (Next.js/TypeScript default)
- Updated paths: `../api.js` → `../lib/api`
- Updated paths: `./netease.js` → `./netease`

## Benefits of Migration

1. **Simplified Architecture**: Single application instead of frontend + backend
2. **Better Developer Experience**: Hot reload works for both frontend and backend
3. **Easier Deployment**: Deploy to Vercel or any Node.js host
4. **Built-in Optimizations**: Next.js provides automatic code splitting, image optimization, etc.
5. **TypeScript Integration**: Better TypeScript support out of the box
6. **API Routes**: Serverless-ready API routes that can be deployed independently

## Running the Application

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Environment
Set the port with:
```bash
PORT=3000 npm start
```

## Deployment Options

1. **Vercel** (Recommended): Push to GitHub and deploy via Vercel dashboard
2. **Docker**: Build container and deploy anywhere
3. **Node.js Server**: Use PM2 or similar process manager
4. **Serverless**: Deploy to AWS Lambda, Google Cloud Functions, etc.

## Rollback Plan

If needed to rollback:
1. Checkout the commit before migration
2. The old architecture files are preserved in git history
3. All functionality remains the same, just restructured

## Testing

The migration was tested by:
1. Successful build: `npm run build`
2. Starting the production server: `npm start`
3. Verifying the homepage loads
4. Checking all API routes are properly created

## Future Improvements

With Next.js, the project can now leverage:
- Server Components for better performance
- Incremental Static Regeneration (ISR) for certain pages
- Edge Runtime for API routes (if netease API package can be replaced)
- Built-in Image Optimization
- Middleware for authentication/authorization
- Better SEO with server-side rendering
