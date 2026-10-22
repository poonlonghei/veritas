from contextlib import contextmanager
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from django.conf import settings


@contextmanager
def _connect():
    database_path = Path(settings.INTENTIONS_DB_PATH)
    database_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(database_path, timeout=5)
    connection.row_factory = sqlite3.Row
    try:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS intentions (
                id TEXT PRIMARY KEY,
                text TEXT NOT NULL,
                name TEXT NOT NULL DEFAULT 'Anonymous',
                location TEXT NOT NULL DEFAULT '',
                language TEXT NOT NULL DEFAULT 'en',
                created_at TEXT NOT NULL
            )
            """
        )
        existing_columns = {
            row["name"] for row in connection.execute("PRAGMA table_info(intentions)")
        }
        if "name" not in existing_columns:
            connection.execute(
                "ALTER TABLE intentions ADD COLUMN name TEXT NOT NULL DEFAULT 'Anonymous'"
            )
        if "location" not in existing_columns:
            connection.execute(
                "ALTER TABLE intentions ADD COLUMN location TEXT NOT NULL DEFAULT ''"
            )
        if "language" not in existing_columns:
            connection.execute(
                "ALTER TABLE intentions ADD COLUMN language TEXT NOT NULL DEFAULT 'en'"
            )
        connection.commit()
        with connection:
            yield connection
    finally:
        connection.close()


def list_intentions(month, language):
    with _connect() as connection:
        rows = connection.execute(
            """
            SELECT id, text, name, location, language, created_at
            FROM intentions
            WHERE substr(created_at, 1, 7) = ? AND language = ?
            ORDER BY created_at DESC
            """,
            (month, language),
        ).fetchall()
    return [
        {
            "id": row["id"],
            "text": row["text"],
            "name": row["name"],
            "location": row["location"],
            "language": row["language"],
            "createdAt": row["created_at"],
        }
        for row in rows
    ]


def list_intention_months(language):
    with _connect() as connection:
        rows = connection.execute(
            """
            SELECT DISTINCT substr(created_at, 1, 7) AS month
            FROM intentions
            WHERE language = ?
            ORDER BY month DESC
            """,
            (language,),
        ).fetchall()
    return [row["month"] for row in rows]


def create_intention(text, name, location, language):
    intention = {
        "id": str(uuid4()),
        "text": text,
        "name": name,
        "location": location,
        "language": language,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    with _connect() as connection:
        connection.execute(
            """
            INSERT INTO intentions (id, text, name, location, language, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                intention["id"],
                intention["text"],
                intention["name"],
                intention["location"],
                intention["language"],
                intention["createdAt"],
            ),
        )
    return intention
