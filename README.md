# Ask-My-Portfolio API (optional dynamic-LLM backend)

This tiny folder is **not** part of the portfolio site itself — the portfolio
stays a plain static site that works on GitHub Pages with zero setup, and
the "Ask my portfolio" widget already works out of the box using a local
knowledge-base matcher (no server, no API key, nothing to deploy).

This folder exists only if you want to upgrade that widget so it answers
**dynamically**, using a real LLM, instead of just keyword-matching. It's a
single serverless function whose only job is to keep an API key secret
(a static site can never hide a secret, so it can't call an LLM directly).

If you never do the steps below, the site still works perfectly — the
widget just stays in its offline/static mode forever.

## What you need

- A free Groq account (Groq gives a generous free tier and is very fast).
- A free Vercel account (to host this one function).
- 10 minutes.

## Step by step

### 1. Get a free Groq API key

1. Go to https://console.groq.com and sign up (free).
2. Go to **API Keys** in the left sidebar.
3. Click **Create API Key**, give it any name (e.g. `portfolio-ask`), copy
   the key somewhere safe. You won't be able to see it again.

### 2. Put this folder in its own GitHub repo

This needs to be a **separate** repo from your portfolio repo (the
portfolio repo is public static files; this one holds a serverless
function and should be deployed on its own).

1. Create a new repo, e.g. `yug-portfolio-ask-api`.
2. Push just the contents of this `ask-api` folder to it:
   ```
   cd ask-api
   git init
   git add .
   git commit -m "Serverless proxy for portfolio Ask widget"
   git branch -M main
   git remote add origin https://github.com/<your-username>/yug-portfolio-ask-api.git
   git push -u origin main
   ```

### 3. Deploy it on Vercel

1. Go to https://vercel.com and sign up / log in (you can use your GitHub
   account).
2. Click **Add New → Project**, and import the `yug-portfolio-ask-api`
   repo you just pushed.
3. Vercel will auto-detect it as a Node project — you don't need to change
   any build settings, just click **Deploy**.
4. Once deployed, go to the project's **Settings → Environment Variables**
   and add:
   - Name: `GROQ_API_KEY`
   - Value: *(the key you copied in step 1)*
5. Go back to **Deployments**, click the ⋯ menu on the latest deployment
   and choose **Redeploy** (env vars only apply after a redeploy).

### 4. Get your function's URL

After deploying, Vercel gives you a URL like:

```
https://yug-portfolio-ask-api.vercel.app
```

Your function lives at `/api/ask`, so the full endpoint is:

```
https://yug-portfolio-ask-api.vercel.app/api/ask
```

You can sanity-check it works with:

```
curl -X POST https://yug-portfolio-ask-api.vercel.app/api/ask \
  -H "Content-Type: application/json" \
  -d '{"question":"What is your Kafka experience?"}'
```

You should get back `{"answer": "..."}`.

### 5. Point the portfolio at it

Open `js/script.js` in the portfolio project and set:

```js
const ASK_API_URL = 'https://yug-portfolio-ask-api.vercel.app/api/ask';
```

Save, commit, and push the portfolio repo. That's it — the widget will now
try the live model first, and silently fall back to the static knowledge
base if the request ever fails or times out (so it can never actually break
for a visitor, even if the free tier is asleep or rate-limited).

## Updating what it knows

Everything the model is allowed to say lives in the `KNOWLEDGE_BASE` string
at the top of `api/ask.js`. Edit that text, redeploy on Vercel (pushing to
`main` auto-redeploys), and the model's answers update immediately — no
frontend changes needed.

## Cost

Groq's free tier is generous enough for a personal portfolio's traffic.
Vercel's free tier covers this easily too. Keep an eye on both dashboards
if the site ever gets unusually heavy traffic.
