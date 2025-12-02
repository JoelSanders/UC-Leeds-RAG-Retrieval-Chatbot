# 🚀 Cloudflare Deployment Guide

This guide explains how to deploy UC Oracle Chatbot to Cloudflare Workers.

## Prerequisites

1. **Cloudflare Account** - [Sign up free](https://dash.cloudflare.com/sign-up)
2. **Wrangler CLI** - Installed via npm (included in devDependencies)
3. **API Keys** ready:
   - OpenAI API Key
   - Pinecone API Key
   - Pinecone Host URL
   - Google Gemini API Key

## Quick Deploy

### 1. Install Dependencies

```bash
npm install
```

### 2. Login to Cloudflare

```bash
npx wrangler login
```

This opens a browser window to authenticate.

### 3. Set Environment Secrets

```bash
# Set each secret (you'll be prompted to enter the value)
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put PINECONE_API_KEY
npx wrangler secret put PINECONE_HOST
npx wrangler secret put GEMINI_API_KEY
```

**Finding your Pinecone Host:**
- Go to [Pinecone Console](https://app.pinecone.io)
- Select your index
- Copy the host URL (e.g., `chatbot-documents-abc123.svc.us-east-1.pinecone.io`)

### 4. Deploy

```bash
npm run deploy
```

Your app will be live at: `https://uc-oracle-chatbot.<your-subdomain>.workers.dev`

## Configuration

### wrangler.toml

```toml
name = "uc-oracle-chatbot"
main = "src/worker.js"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[vars]
ENVIRONMENT = "production"

[site]
bucket = "./public"
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Your OpenAI API key for embeddings |
| `PINECONE_API_KEY` | Your Pinecone API key |
| `PINECONE_HOST` | Your Pinecone index host URL |
| `GEMINI_API_KEY` | Your Google Gemini API key |

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run deploy` | Deploy to production |
| `npm run deploy:preview` | Deploy to preview environment |
| `npm run cf:dev` | Start local development server |
| `npm run cf:tail` | View real-time logs |
| `npm run cf:secrets` | Show secret setup commands |

## Local Development with Wrangler

```bash
# Start local dev server
npm run cf:dev

# The app will be available at http://localhost:8787
```

## Custom Domain

### Option 1: Via Cloudflare Dashboard

1. Go to **Workers & Pages** in Cloudflare Dashboard
2. Select your worker
3. Go to **Settings** → **Triggers**
4. Add a **Custom Domain**

### Option 2: Via wrangler.toml

Add to your `wrangler.toml`:

```toml
routes = [
  { pattern = "oracle.yourdomain.com/*", zone_name = "yourdomain.com" }
]
```

## Architecture on Cloudflare

```
┌─────────────────┐
│   User Browser  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Cloudflare Edge │ ← Global CDN (300+ locations)
│    (Worker)     │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌─────────┐
│OpenAI │ │Pinecone │
│ API   │ │ Vector  │
└───────┘ │   DB    │
          └─────────┘
              │
              ▼
         ┌─────────┐
         │ Gemini  │
         │   API   │
         └─────────┘
```

## Performance Benefits

| Feature | Benefit |
|---------|---------|
| **Edge Computing** | Runs in 300+ locations worldwide |
| **Zero Cold Starts** | Sub-millisecond startup time |
| **Auto Scaling** | Handles millions of requests |
| **Built-in Caching** | Automatic response caching |
| **DDoS Protection** | Enterprise-grade security |

## Cost Estimate

Cloudflare Workers pricing (as of 2024):

| Tier | Requests/month | Price |
|------|----------------|-------|
| Free | 100,000 | $0 |
| Paid | 10 million | $5/month |
| Additional | Per million | $0.50 |

Most university chatbot deployments fit comfortably in the free tier!

## Troubleshooting

### "Secret not found" error

Make sure all secrets are set:
```bash
npx wrangler secret list
```

### CORS errors

The worker includes CORS headers. If issues persist, check your frontend's API URL.

### Slow responses

1. Check Pinecone region matches Cloudflare edge
2. Reduce `topK` value for faster queries
3. Enable response caching

### Debugging

View real-time logs:
```bash
npm run cf:tail
```

## Alternative: Cloudflare Pages (Frontend Only)

If you prefer to keep the backend separate:

1. Deploy frontend to Cloudflare Pages:
```bash
npx wrangler pages deploy ./public --project-name=uc-oracle-frontend
```

2. Keep backend on:
   - Railway
   - Render
   - Vercel
   - Your own server

3. Update `public/app.js` to point to your backend URL.

## Support

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
- [Hono Framework](https://hono.dev/)

---

**Ready to deploy?** Run `npm run deploy` 🚀

