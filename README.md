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
2. Create a **Static Site** from the `main` branch and use the repository root (`.`) as the publish directory.
3. In the service's Render environment settings, add `MEDIPOINT_SUPABASE_URL` and `MEDIPOINT_SUPABASE_ANON_KEY` with values from the same Supabase project used by the kiosk.
4. Save and deploy. The `render.yaml` build command generates `front/login-pages/medipoint-config.js`; it fails if either variable is missing.

The generated browser config is part of the published site, so the anon/publishable key is visible to visitors by design. Never use a Supabase service-role key here. `MEDIPOINT_KIOSK_ID` is left blank unless your setup explicitly requires a kiosk ID. Render Secret Files are not needed for this static-site config.

`render.yaml` is included as the Render Blueprint. Supabase Edge Functions are deployed separately to the same Supabase project.

## Keep the kiosk in sync

On the clinic PC, keep the original MediPoint app. Its `medipoint-config.js` must point at the same Supabase URL and anon key so `store-assessment` writes the records this portal reads.
