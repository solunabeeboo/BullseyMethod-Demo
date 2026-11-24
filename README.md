# Bullseye Method (installable web app)

The Bullseye Method was made by Wyatt as a Claude artifact. This version runs anywhere as a
**Progressive Web App (PWA)**: you can host it on GitHub Pages, install it on a phone or
computer, and use it offline.

## What's in the folder

| File | What it does |
|---|---|
| `index.html` | The app itself |
| `claude-shim.js` | Takes the place of Claude's built-in storage and downloads when the app runs outside Claude |
| `manifest.webmanifest` | App name, icons, and colors, so browsers can install it |
| `sw.js` | Service worker: caches the app so it loads offline, and announces updates |
| `icons/` | App icons (regular, maskable for Android, Apple touch icon, favicon) |
| `vendor/jspdf.umd.min.js` | PDF library, kept locally so export works offline |
| `fonts/` | Instrument Sans font files, kept locally |
| `.nojekyll` | Tells GitHub Pages to serve the files exactly as they are |

## Where your data lives

Outside Claude, projects are saved in **this browser on this device** (`localStorage`).
That means:

- Each person who opens the link has their own private data. Nobody sees anyone else's projects.
- Your phone and your laptop each keep separate data.
- Clearing site data in your browser deletes your projects.

Use **Back up data** in the side menu (☰) to download a `.json` copy, and **Restore from
backup** to load it on another device or browser. Back up often.

The Bug report / Suggestions / Feedback inbox buttons are hidden in this version, because
on a static site there's nowhere to send reports.

---

## Put it on GitHub Pages

You need a free GitHub account. On the free plan, the repository must be **public** for Pages to work.

### Option A: in the browser (no command line)

1. Go to <https://github.com/new>.
2. Name the repository, e.g. `bullseye-method`. Set it to **Public**. Click **Create repository**.
3. On the new repo's page, click **uploading an existing file**.
4. Unzip `bullseye-method.zip` on your computer. Open the unzipped folder, select **everything
   inside it** (including the `icons`, `vendor`, and `fonts` folders), and drag it all into the
   GitHub upload area. Drag the files *inside* the folder, not the folder itself, so that
   `index.html` ends up at the top level of the repo.
   - `.nojekyll` is a hidden file. On a Mac, press **Cmd + Shift + .** in Finder to show it.
     If it doesn't get uploaded, click **Add file → Create new file**, name it `.nojekyll`,
     leave it empty, and commit.
5. Click **Commit changes**.
6. Go to **Settings → Pages** (in the "Code and automation" section of the sidebar).
7. Under **Build and deployment → Source**, choose **Deploy from a branch**. Set Branch to
   **main** and folder to **/ (root)**. Click **Save**.
8. Wait a minute or two, then refresh the Pages settings page. It shows your site address:
   `https://YOUR-USERNAME.github.io/bullseye-method/`

### Option B: with git

```bash
cd bullseye-method          # the unzipped folder
git init
git add .
git commit -m "Bullseye Method PWA"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/bullseye-method.git
git push -u origin main
```

Then do steps 6–8 above.

## Install it as an app

- **Chrome / Edge (desktop or Android):** open the site, then click the install icon in the
  address bar, or use the browser menu → **Install Bullseye Method** / **Add to Home screen**.
- **iPhone / iPad (Safari):** tap **Share → Add to Home Screen**.
- **Mac Safari (Sonoma or later):** **File → Add to Dock**.

After the first visit, it opens and works with no internet connection.

## Publishing changes

1. Edit the files and commit/upload them to the repo.
2. **Change `VERSION` at the top of `sw.js`** (e.g. `bullseye-v1` → `bullseye-v2`). Without
   this, installed copies keep the old files.
3. People with the app open see "A new version is ready" with a **Reload** button.

## Testing locally

A service worker needs `https://` or `localhost`. Opening `index.html` straight from disk
(`file://`) runs the app, but it won't install or work offline. To test properly:

```bash
cd bullseye-method
python3 -m http.server 8000
# open http://localhost:8000
```

## Want shared data instead?

All storage goes through `claude-shim.js`, which offers the same small interface the app
already uses (`collection().onSnapshot`, `doc().set/update/delete/get`). To let a team share
projects, you could replace the localStorage part of that file with a hosted database such as
Firebase Firestore, whose API this interface already mirrors, plus sign-in. `index.html`
would not need to change.

## Credits

App by Wyatt. jsPDF (MIT, see `vendor/jspdf-LICENSE.txt`). Instrument Sans (SIL Open Font
License, see `fonts/OFL.txt`).
