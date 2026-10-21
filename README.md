# Veritas — A quiet place to pray

A quiet and peaceful place for Catholic prayer: daily reflection, a searchable prayer library, a guided Rosary, and a personal list of prayer intentions.

## Stack

- **Web:** Next.js 16, React 19, TypeScript
- **API:** Django 5.2, Python 3.10+, JSON REST endpoints
- **Persistence:** MongoDB (prayer intentions)

The prayer catalog and daily reflections are bundled with the Django API. Prayer intentions are shared with all visitors and saved in MongoDB; do not post sensitive or identifying information. Saved prayers are stored in the visitor's browser.

## Run everything with Docker

From this folder, create the local environment file and start the services:

```bash
cp .env.example .env
docker compose up --build
```

Open <http://localhost:3000>. The API is at <http://localhost:8000/api/> and MongoDB listens on port `27017`.

## Run locally without Docker

1. Start MongoDB locally and set up the API:

   ```bash
   python3.10 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   cp .env.example .env
   set -a && source .env && set +a
   python manage.py runserver
   ```

2. In another terminal, install and start the web app:

   ```bash
   npm install
   npm run dev
   ```

3. Visit <http://localhost:3000>.

The web app shows its built-in prayer catalog if the API is unavailable. Adding and removing prayer intentions requires a reachable Django API and MongoDB instance; API errors are shown in the interface. In local development, start the complete stack with Docker Compose or run the API and MongoDB separately before adding intentions.

## Deploy to GitHub Pages

The workflow at `.github/workflows/deploy-pages.yml` exports the Next.js app as a static site and deploys it with GitHub Actions whenever code is pushed to `main`. To publish:

1. Create a **public** GitHub repository named `veritas` and push this project to its `main` branch.
2. In the repository, open **Settings → Pages** and set the build and deployment source to **GitHub Actions**.
3. The first successful workflow run publishes the site at `https://<owner>.github.io/veritas/`.

GitHub Pages serves static files only; it cannot run Django or MongoDB. The prayer library, saved prayers, and Rosary work on Pages, but shared prayer intentions need the Django API and MongoDB deployed separately. Set `NEXT_PUBLIC_API_URL` at build time to the deployed API base URL (for example, `https://api.example.com/api`) and allow the Pages origin in the backend's `CORS_ALLOWED_ORIGINS`. A production build without this setting will not try the visitor's `localhost`; the intentions page explains the missing configuration instead. Do not put MongoDB credentials or Django secrets in `NEXT_PUBLIC_*` variables.

## Configuration

| Variable | Purpose | Default |
| --- | --- | --- |
| `MONGODB_URI` | MongoDB connection URI | `mongodb://localhost:27017` |
| `MONGODB_DATABASE` | Database for prayer intentions | `veritas` |
| `DJANGO_SECRET_KEY` | Django secret; set a unique value outside development | Development placeholder |
| `DJANGO_DEBUG` | Enable Django debug mode | `0` |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated Django host allowlist | `localhost,127.0.0.1` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated browser origins permitted by the API | `http://localhost:3000,http://127.0.0.1:3000` |
| `NEXT_PUBLIC_API_URL` | Django API base URL used by the web app; set as an Actions variable for a hosted API | `http://localhost:8000/api` locally |

## API

- `GET /api/prayers/` — list prayers; optional `q` and `category` filters
- `GET /api/daily/` — today's daily reflection and prayer
- `GET /api/intentions/` — list the latest 50 intentions
- `POST /api/intentions/` — add an intention (`{"text":"..."}`, up to 500 characters)
- `DELETE /api/intentions/{id}/` — remove an intention