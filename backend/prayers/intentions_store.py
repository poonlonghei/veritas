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
                created_at TEXT NOT NULL
            )
            """
        )
        connection.commit()
        with connection:
            yield connection
    finally:
        connection.close()


def list_intentions():
    with _connect() as connection:
        rows = connection.execute(
            "SELECT id, text, created_at FROM intentions ORDER BY created_at DESC LIMIT 50"
        ).fetchall()
    return [
        {"id": row["id"], "text": row["text"], "createdAt": row["created_at"]}
        for row in rows
    ]


def create_intention(text):
    intention = {
        "id": str(uuid4()),
        "text": text,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    with _connect() as connection:
        connection.execute(
            "INSERT INTO intentions (id, text, created_at) VALUES (?, ?, ?)",
            (intention["id"], intention["text"], intention["createdAt"]),
        )
    return intention


def delete_intention(intention_id):
    with _connect() as connection:
        cursor = connection.execute(
            "DELETE FROM intentions WHERE id = ?", (intention_id,)
        )
    return cursor.rowcount > 0
