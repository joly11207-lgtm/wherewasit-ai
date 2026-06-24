# WhereWasIt.ai

WhereWasIt.ai is an AI-assisted lost item recovery app built with Next.js, TypeScript, and Tailwind CSS.

It uses a local reasoning pipeline to extract clues and build a likely search plan first. OpenRouter is used only to narrate the result in a calmer, more human format.

## Local development

1. Install dependencies:
   `npm install`
2. Create a local env file and add your key:
   `OPENROUTER_API_KEY=your_key_here`
3. Start the dev server:
   `npm run dev`

Optional:
- Run the local engine evaluator with `npm run eval:engine`
- Run the narrator evaluator with `npm run eval:narrator`

## Environment variables

- `OPENROUTER_API_KEY`
- `DEBUG_OPENROUTER=true` to print full OpenRouter responses during narrator testing

## Deploy on Vercel

These notes are based on Vercel's current Next.js documentation. Vercel describes Next.js deployment as zero-configuration and says you can install the Vercel CLI and run `vercel` from the project root. Vercel also supports Git-connected preview URLs for pull requests. Sources: [Vercel Next.js docs](https://vercel.com/docs/frameworks/full-stack/nextjs)

Recommended alpha flow:

1. Push this repo to GitHub, GitLab, or Bitbucket.
2. In Vercel, create a new project and import the repo.
3. Add `OPENROUTER_API_KEY` in the project environment variables.
4. Leave the framework as `Next.js`.
5. Deploy.
6. Add your production domain when ready.

CLI option:

1. Install the CLI:
   `npm i -g vercel`
2. From the project root, run:
   `vercel`
3. Follow the prompts and set `OPENROUTER_API_KEY` in the Vercel dashboard.

Alpha recommendation:

- Enable Vercel preview deployments for every pull request.
- Review server logs for `/api/track` analytics events and narrator diagnostics.

## Deploy on Cloudflare

These notes are based on Cloudflare's current Next.js Workers documentation. Cloudflare documents deploying Next.js on Workers using the OpenNext adapter, and notes that `wrangler deploy` can auto-detect an existing Next.js project. Sources: [Cloudflare Next.js on Workers docs](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)

Recommended alpha flow for an existing project:

1. Install Cloudflare tooling:
   `npm i -D wrangler@latest @opennextjs/cloudflare@latest`
2. Add an OpenNext config file:

   ```ts
   import { defineCloudflareConfig } from "@opennextjs/cloudflare";

   export default defineCloudflareConfig();
   ```

3. Add a `wrangler.jsonc` file:

   ```jsonc
   {
     "$schema": "./node_modules/wrangler/config-schema.json",
     "main": ".open-next/worker.js",
     "name": "wherewasit-ai",
     "compatibility_date": "2026-06-24",
     "compatibility_flags": ["nodejs_compat"],
     "assets": {
       "directory": ".open-next/assets",
       "binding": "ASSETS"
     }
   }
   ```

4. Add scripts like these to `package.json` if you want the Cloudflare adapter workflow:

   ```json
   {
     "preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
     "deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy"
   }
   ```

5. Set `OPENROUTER_API_KEY` as a Cloudflare secret or environment variable for the Worker.
6. Test locally with:
   `npm run preview`
7. Deploy with:
   `npx wrangler deploy`
   or, if you add the adapter scripts above:
   `npm run deploy`

Notes:

- Cloudflare's docs say automatic configuration can detect Next.js and generate the needed Worker config for an existing project.
- The docs also note that Node.js middleware introduced in Next.js 15.2 is not yet supported.

## Public alpha checklist

- `OPENROUTER_API_KEY` set in production
- `DEBUG_OPENROUTER` off in production
- Privacy and Terms pages reachable
- Analytics route logs visible
- Narrator evaluation tested before changing models
