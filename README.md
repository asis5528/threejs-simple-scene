# Simple Three.js Scene

A minimal Three.js scene with a rotating cube and ring. No build step required.

## Local preview

From this folder:

```powershell
python -m http.server 8080
```

Open `http://localhost:8080`.

## Deploy without port forwarding

You do **not** need port forwarding because these are external static hosts.

## Fully automated deploy (GitHub Pages)

Use this script to automate repo creation + push + Pages publish:

```powershell
# one-time in this terminal (create token with repo + pages permission)
$env:GITHUB_TOKEN = "YOUR_GITHUB_TOKEN"

# run deploy
.\deploy-github-pages.ps1 -RepoName threejs-simple-scene
```

Optional custom domain:

```powershell
.\deploy-github-pages.ps1 -RepoName threejs-simple-scene -CustomDomain yourdomain.com
```

This gives you a public URL like:
`https://YOUR_GITHUB_USERNAME.github.io/threejs-simple-scene/` (username auto-detected)

### Option 1: Cloudflare Pages (recommended)
1. Put this project on GitHub.
2. In Cloudflare Pages, create a new project from that repo.
3. Build command: *(leave empty)*
4. Output directory: `/`
5. Deploy.

Custom domain:
1. In Pages project, go to **Custom domains**.
2. Add your domain/subdomain.
3. Follow Cloudflare DNS instructions (usually `CNAME` for subdomain).

### Option 2: Netlify Drop (fastest)
1. Zip these files (`index.html`, `main.js`, `styles.css`).
2. Drag-and-drop zip at `https://app.netlify.com/drop`.
3. Netlify gives you a public URL instantly.

Custom domain:
1. Site settings -> Domain management.
2. Add custom domain and update your DNS records.

### Option 3: GitHub Pages (free)
1. Push files to a GitHub repo.
2. Settings -> Pages.
3. Source: `Deploy from a branch`, branch `main`, folder `/ (root)`.
4. Wait for deploy and open generated URL.

Custom domain:
1. In Pages settings, add custom domain.
2. Add DNS records at your domain registrar (`CNAME`/`A` as shown by GitHub).

## Notes
- This project imports Three.js from `unpkg` CDN.
- If you want fully offline hosting, we can switch to local npm dependency + bundled files.
