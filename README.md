# Veritas — A quiet place to pray

A quiet and peaceful place for Catholic prayer: daily reflection, a searchable prayer library, and a guided Rosary.

## Stack

- **Web:** Next.js 16, React 19, TypeScript, JavaScript, Tailwind CSS 4
- **Prayer API:** Java 21 HTTP service for the prayer library and daily reflection
- **Intentions API:** Django 5.2, Python 3.10+, JSON REST endpoints
- **Persistence:** SQLite (prayer intentions)

The prayer catalog and daily reflections are served by the Java API and bundled in the web app as an offline fallback. Our Father, Hail Mary, and Glory Be are available in English and Latin. Saved prayers are stored in the visitor's browser.

## Run everything with Docker

From this folder, create the local environment file and start the services:

```bash
cp .env.example .env
docker compose up --build
```

Open <http://localhost:3000>. The Java prayer API is at <http://localhost:8080/api/> and the Django intentions API is at <http://localhost:8000/api/>. SQLite data is stored in the `veritas-intentions` Docker volume.

## Run locally without Docker

1. Start the Django intentions API (SQLite is included with Python):

   ```bash
   python3.10 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   mkdir -p data
   cp .env.example .env
   set -a && source .env && set +a
   python manage.py runserver
   ```

2. In another terminal, compile and start the Java prayer API:

   ```bash
   mkdir -p /tmp/veritas-prayer-api
   javac --release 21 --add-modules jdk.httpserver -d /tmp/veritas-prayer-api java/src/main/java/com/veritas/prayers/PrayerApplication.java
   PORT=8080 java --add-modules jdk.httpserver -cp /tmp/veritas-prayer-api com.veritas.prayers.PrayerApplication
   ```

3. In another terminal, install and start the web app:

   ```bash
   npm install
   npm run dev
   ```

4. Visit <http://localhost:3000>.

The web app shows its built-in prayer catalog if the Java API is unavailable. Adding and removing prayer intentions requires a reachable Django API; API errors are shown in the interface. The SQLite database is created automatically at `INTENTIONS_DB_PATH`.

## Deploy to GitHub Pages

The workflow at `.github/workflows/nextjs.yml` exports the Next.js app as a static site and deploys it with GitHub Actions whenever code is pushed to `main`. To publish:

1. Create a **public** GitHub repository named `veritas` and push this project to its `main` branch.
2. In the repository, open **Settings → Pages** and set the build and deployment source to **GitHub Actions**.
3. The first successful workflow run publishes the site at `https://<owner>.github.io/veritas/`.

GitHub Pages serves static files only; it cannot run Django or Java. The prayer library, saved prayers, and Rosary work on Pages, while live daily content needs the Java API deployed separately.

### Deploy the APIs on Render

1. In Render, create a **Blueprint** from this repository and deploy the `render.yaml` configuration. The blueprint deploys the Django intentions API and Java prayer API, generates the Django secret, configures the Pages CORS origin, and uses Render's assigned hostname for Django's allowed-host check.
2. In GitHub, open **Settings → Secrets and variables → Actions → Variables → New repository variable**. Set `NEXT_PUBLIC_API_URL` to the Django intentions service URL and `NEXT_PUBLIC_PRAYER_API_URL` to the Java prayer service URL; include `/api` in both values.
3. Re-run **Actions → Deploy Next.js site to Pages → Run workflow** (or push a commit) to build the frontend with the API URLs.

SQLite is stored on the application filesystem. Render's default filesystem is ephemeral, so use a persistent disk for the Python service if intentions must survive redeploys. The Pages origin configured in `render.yaml` is `https://poonlonghei.github.io`. If your published Pages site uses a different owner/domain, update `CORS_ALLOWED_ORIGINS` in `render.yaml` for both services before deploying. Never put Django secrets in `NEXT_PUBLIC_*` variables. A production build without `NEXT_PUBLIC_API_URL` will not try the visitor's `localhost`.


## Configuration

| Variable | Purpose | Default |
| --- | --- | --- |
| `INTENTIONS_DB_PATH` | SQLite file path for prayer intentions | `./data/intentions.sqlite3` locally |
| `DJANGO_SECRET_KEY` | Django secret; set a unique value outside development | Development placeholder |
| `DJANGO_DEBUG` | Enable Django debug mode | `0` |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated Django host allowlist | `localhost,127.0.0.1` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated browser origins permitted by the API | `http://localhost:3000,http://127.0.0.1:3000` |
| `NEXT_PUBLIC_API_URL` | Django intentions API base URL; set as an Actions variable for deployment | `http://localhost:8000/api` locally |
| `NEXT_PUBLIC_PRAYER_API_URL` | Java prayer API base URL; set as an Actions variable for deployment | `http://localhost:8080/api` locally |

## API

- Java `GET /api/prayers/` — list prayers; optional `q` and `category` filters
- Java `GET /api/daily/` — today's daily reflection and prayer
- Java `GET /health` — service health check
- Django `GET /api/health/` — intentions service health check
- `GET /api/intentions/` — list the latest 50 intentions
- `POST /api/intentions/` — add an intention (`{"text":"..."}`, up to 500 characters)
- `DELETE /api/intentions/{id}/` — remove an intention

`/api/intentions/` endpoints are served by Django; the Java service serves the prayer and daily endpoints. In production, set each frontend API variable to its respective Render service URL.