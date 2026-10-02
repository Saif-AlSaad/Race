# APEX HORIZON — Golden Hour Grand Prix 🏎️💨

An arcade racing game featuring dynamic drifting physics, AI opponents, procedural Web Audio engine sounds, lap tracking, touch/keyboard controls, and sleek responsive HUD.

---

## 🚀 How to Host on GitHub Pages

This project is fully configured for GitHub Pages with both **GitHub Actions (recommended)** and **Manual Deployment (`gh-pages`)**.

### Method 1: Automated Deployment via GitHub Actions (Recommended)

1. **Create a repository on GitHub**:
   - Go to [GitHub New Repository](https://github.com/new).
   - Name your repository (e.g. `Race` or `apex-horizon`).
   - Do **not** initialize with README or .gitignore (we already have them).

2. **Push your code to GitHub**:
   Run the following commands in your terminal:
   ```bash
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<REPO_NAME>.git
   git branch -M main
   git push -u origin main
   ```

3. **Enable GitHub Actions in Pages Settings**:
   - Go to your repository on GitHub.
   - Click **Settings** (tab at the top) → **Pages** (in the left sidebar under *Code and automation*).
   - Under **Build and deployment** > **Source**, select **GitHub Actions**.

4. **That's it!**
   - The workflow in `.github/workflows/deploy.yml` will automatically build and publish your game.
   - Your game will be live at:
     ```
     https://<YOUR_GITHUB_USERNAME>.github.io/<REPO_NAME>/
     ```

---

### Method 2: Manual Deployment with `npm run deploy`

If you prefer deploying via the `gh-pages` branch:

1. **Push your code to your GitHub repo**:
   ```bash
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<REPO_NAME>.git
   git push -u origin main
   ```

2. **Run the deploy command**:
   ```bash
   npm run deploy
   ```
   *(This builds `dist/` and pushes it directly to the `gh-pages` branch).*

3. **Verify Settings on GitHub**:
   - Go to **Settings** → **Pages**.
   - Under **Source**, choose **Deploy from a branch**.
   - Select the **gh-pages** branch and **/ (root)** folder, then click **Save**.

---

## 🛠️ Local Development

### 1. Install dependencies
```bash
npm install
```

### 2. Run local development server
```bash
npm run dev
```

### 3. Build for production
```bash
npm run build
```

### 4. Preview production build locally
```bash
npm run preview
```

---

## 🎮 Controls

- **Steer**: `A` / `D` or `Left Arrow` / `Right Arrow`
- **Accelerate**: `W` or `Up Arrow`
- **Brake / Reverse**: `S` or `Down Arrow`
- **Handbrake / Drift**: `Space`
- **Touch / Mobile**: On-screen steering buttons, throttle, brake, and drift pedals.
