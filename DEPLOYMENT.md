# 🚀 Cloud Deployment Guide (Render + Vercel)

This project consists of two components:
1. **Backend**: Python FastAPI (`/backend`) deployed on [Render.com](https://render.com) (Free tier)
2. **Frontend**: Next.js 16 (`/frontend`) deployed on [Vercel.com](https://vercel.com) (Free tier)

---

## Step 1: Push Code to GitHub

Open a terminal in the project root and run:

```bash
# Initialize git (if not already done)
git init

# Stage and commit all files
git add .
git commit -m "feat: complete customer feedback intelligence platform ready for cloud deployment"

# Create a new repository on https://github.com/new (e.g., feedback-intelligence)
# Then link and push:
git branch -M main
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPO_NAME>.git
git push -u origin main
```

---

## Step 2: Deploy Backend on Render (Free)

1. Sign in to [Render.com](https://dashboard.render.com/) with GitHub.
2. Click **New +** > **Web Service**.
3. Select **Build and deploy from a Git repository** and pick your newly pushed repository.
4. Fill in the deployment details:
   - **Name**: `customer-feedback-api` (or any name you like)
   - **Region**: Choose the closest region (e.g. Frankfurt, Singapore, Oregon)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free`
5. Expand **Environment Variables** and add:
   - `GEMINI_API_KEY`: *(Your Google Gemini API Key from [Google AI Studio](https://aistudio.google.com/app/apikey))*
   - `GEMINI_MODEL`: `gemini-2.5-flash`
   - `ENVIRONMENT`: `production`
6. Click **Deploy Web Service**.
7. Once deployed, Render will provide your public backend URL, e.g.:  
   `https://customer-feedback-api-xxxx.onrender.com`
   *(Test it in your browser: `https://customer-feedback-api-xxxx.onrender.com/api/health`)*

---

## Step 3: Deploy Frontend on Vercel (Free)

1. Sign in to [Vercel.com](https://vercel.com/) with GitHub.
2. Click **Add New...** > **Project**.
3. Import your GitHub repository.
4. In the **Configure Project** screen:
   - **Framework Preset**: `Next.js` (automatically detected)
   - **Root Directory**: Click **Edit** and select `frontend`
5. Expand **Environment Variables** and add:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://customer-feedback-api-xxxx.onrender.com` *(Your Render backend URL from Step 2, with no trailing slash)*
6. Click **Deploy**.
7. In ~60 seconds, your site will be live at:  
   `https://<your-project-name>.vercel.app` 🎉

---

## Step 4: Verification

1. Open your Vercel URL.
2. In the top bar, ensure the backend connection badge is green (`Backend Connected`).
3. Click on **SaaS Feedback Benchmark** in the dataset selector to view pre-loaded analytics.
4. Navigate to `/upload` to test CSV uploads or download sample datasets.
