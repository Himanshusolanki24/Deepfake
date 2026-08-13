This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Prerequisites

1. A Supabase project (see `supabase/` in the repo root for migrations).
2. A deployed backend API (FastAPI) that the frontend talks to.
3. Environment variables — copy `.env.example` to `.env.local` and fill in values.

## Getting Started

First, copy the env template and run the development server:

```bash
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Environment variables

| Variable | Description | Required |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Public base URL of the deployed app (used for metadata, OG images, auth redirects). | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. | Yes |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key. | Yes |
| `NEXT_PUBLIC_SUPABASE_REDIRECT_URL` | Auth callback redirect URL (e.g. `https://your-domain.com/auth/callback`). | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only service role key (bypasses RLS). Never expose to the client. | Yes |
| `NEXT_PUBLIC_API_URL` | Backend FastAPI base URL. | Yes |
| `NEXT_PUBLIC_USE_MOCKS` | Set to `"true"` only for local demo/dev; leave unset/`"false"` in production. | No |

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js. Set the environment variables above in the Vercel project settings.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
