# MediPoint Portal

Standalone student, personnel, and clinical portal for MediPoint. This package does **not** include the kiosk measuring UI. The kiosk stays on the clinic machine and posts results to the shared Supabase project. This site only authenticates users and displays those stored results.

Live start page: `front/login-pages/portal-auth.html` (also redirected from `/`).

## What is included

- Portal login / sign-up
- Student and personnel dashboards (overview, profile, latest results, assessment, history)
- Clinical staff portal
- Portal Edge Functions: `portal-auth`, `data-retrieval`, `update-profile`, `doctor-data`

Kiosk login, QR check-in, measurement capture, `store-assessment`, and CareMate stay in the main MediPoint repository.

## Configure

1. Copy `front/login-pages/medipoint-config.example.js` to `front/login-pages/medipoint-config.js`.
2. Set `MEDIPOINT_SUPABASE_URL` and `MEDIPOINT_SUPABASE_ANON_KEY` to the **same** Supabase project the kiosk uses.
3. Deploy or reuse the portal Edge Functions in that project.

Without that config, the portal cannot load kiosk results on another device.

## Local preview

From this folder:

```powershell
python -m http.server 5500
```

Open [http://127.0.0.1:5500/](http://127.0.0.1:5500/).

## Deploy on Render

1. Connect this GitHub repository to [Render](https://render.com/).
2. Create a **Static Site**.
3. Set the publish directory to the repository root (`.`).
4. After the first deploy, add `front/login-pages/medipoint-config.js` as a secret file, or bake a non-committed config into the Render build. Do not commit real API keys.

`render.yaml` is included as a starting blueprint.

## Keep the kiosk in sync

On the clinic PC, keep the original MediPoint app. Its `medipoint-config.js` must point at the same Supabase URL and anon key so `store-assessment` writes the records this portal reads.
