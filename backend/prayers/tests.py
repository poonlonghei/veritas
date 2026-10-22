import sqlite3
import tempfile
from pathlib import Path

from django.test import SimpleTestCase, override_settings


class PrayerApiTests(SimpleTestCase):
    def test_health_endpoint_is_available(self):
        response = self.client.get("/api/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_intentions_reject_non_object_json_without_database_access(self):
        response = self.client.post(
            "/api/intentions/",
            data="[]",
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"], "Request body must be a JSON object.")

    def test_intentions_reject_empty_text_without_database_access(self):
        response = self.client.post(
            "/api/intentions/",
            data='{"text":"  "}',
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)

    def test_intentions_reject_text_over_limit_without_database_access(self):
        response = self.client.post(
            "/api/intentions/",
            data='{"text":"' + "x" * 501 + '"}',
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["error"], "Intentions must be 500 characters or fewer."
        )

    def test_intentions_require_publication_consent(self):
        response = self.client.post(
            "/api/intentions/",
            data='{"text":"Please pray for peace.","name":"Alex","location":"London"}',
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["error"],
            "Consent is required before publishing an intention.",
        )

    def test_intentions_can_be_created_and_listed_from_sqlite(self):
        with tempfile.TemporaryDirectory() as directory:
            with override_settings(
                INTENTIONS_DB_PATH=str(Path(directory) / "intentions.sqlite3")
            ):
                created = self.client.post(
                    "/api/intentions/",
                    data=(
                        '{"text":"Please pray for peace.","name":"Alex",'
                        '"location":"London","consent":true,"language":"en"}'
                    ),
                    content_type="application/json",
                )

                self.assertEqual(created.status_code, 201)
                intention = created.json()["intention"]
                self.assertEqual(intention["text"], "Please pray for peace.")
                self.assertEqual(intention["name"], "Alex")
                self.assertEqual(intention["location"], "London")
                self.assertEqual(len(intention["id"]), 36)

                listed = self.client.get("/api/intentions/")
                self.assertEqual(listed.status_code, 200)
                self.assertEqual(listed.json()["intentions"], [intention])
                self.assertIn(intention["createdAt"][:7], listed.json()["months"])

                delete_attempt = self.client.delete(
                    f"/api/intentions/{intention['id']}/"
                )
                self.assertEqual(delete_attempt.status_code, 404)

    def test_intentions_can_be_filtered_by_month(self):
        with tempfile.TemporaryDirectory() as directory:
            with override_settings(
                INTENTIONS_DB_PATH=str(Path(directory) / "intentions.sqlite3")
            ):
                self.client.post(
                    "/api/intentions/",
                    data=(
                        '{"text":"Please pray for peace.","name":"Alex",'
                        '"location":"London","consent":true,"language":"en"}'
                    ),
                    content_type="application/json",
                )

                month = self.client.get("/api/intentions/").json()["month"]
                other_month = "2000-01" if month != "2000-01" else "2000-02"
                response = self.client.get(
                    f"/api/intentions/?month={other_month}"
                )

                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json()["intentions"], [])

    def test_intentions_reject_invalid_month_filter(self):
        response = self.client.get("/api/intentions/?month=2026-13")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"], "Month must use the YYYY-MM format.")

    def test_existing_intention_database_is_upgraded_with_public_fields(self):
        with tempfile.TemporaryDirectory() as directory:
            database_path = Path(directory) / "intentions.sqlite3"
            with sqlite3.connect(database_path) as connection:
                connection.execute(
                    """
                    CREATE TABLE intentions (
                        id TEXT PRIMARY KEY,
                        text TEXT NOT NULL,
                        created_at TEXT NOT NULL
                    )
                    """
                )
                connection.execute(
                    "INSERT INTO intentions (id, text, created_at) VALUES (?, ?, ?)",
                    ("existing", "An existing intention", "2026-10-01T00:00:00+00:00"),
                )

            with override_settings(INTENTIONS_DB_PATH=str(database_path)):
                response = self.client.get("/api/intentions/?month=2026-10")

            self.assertEqual(response.status_code, 200)
            self.assertEqual(
                response.json()["intentions"][0]["name"], "Anonymous"
            )
            self.assertEqual(response.json()["intentions"][0]["location"], "")
            self.assertEqual(response.json()["intentions"][0]["language"], "en")

    def test_intentions_are_separated_by_language(self):
        with tempfile.TemporaryDirectory() as directory:
            with override_settings(
                INTENTIONS_DB_PATH=str(Path(directory) / "intentions.sqlite3")
            ):
                for language, name in (("en", "Alex"), ("zh-TW", "陳先生")):
                    response = self.client.post(
                        "/api/intentions/",
                        data=(
                            '{"text":"Please pray for peace.","name":"'
                            + name
                            + '","location":"London","consent":true,"language":"'
                            + language
                            + '"}'
                        ),
                        content_type="application/json",
                    )
                    self.assertEqual(response.status_code, 201)

                english = self.client.get(
                    "/api/intentions/?language=en"
                ).json()
                chinese = self.client.get(
                    "/api/intentions/?language=zh-TW"
                ).json()

                self.assertEqual([item["name"] for item in english["intentions"]], ["Alex"])
                self.assertEqual([item["name"] for item in chinese["intentions"]], ["陳先生"])
                self.assertEqual(len(english["months"]), 1)
                self.assertEqual(len(chinese["months"]), 1)

    def test_intentions_reject_unsupported_language(self):
        response = self.client.get("/api/intentions/?language=fr")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"], "Language must be 'en' or 'zh-TW'.")

    def test_intentions_reject_unsupported_submission_language(self):
        response = self.client.post(
            "/api/intentions/",
            data=(
                '{"text":"Please pray for peace.","name":"Alex",'
                '"location":"London","consent":true,"language":"fr"}'
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"], "Language must be 'en' or 'zh-TW'.")

    def test_existing_intentions_default_to_english(self):
        with tempfile.TemporaryDirectory() as directory:
            database_path = Path(directory) / "intentions.sqlite3"
            with sqlite3.connect(database_path) as connection:
                connection.execute(
                    """
                    CREATE TABLE intentions (
                        id TEXT PRIMARY KEY,
                        text TEXT NOT NULL,
                        created_at TEXT NOT NULL
                    )
                    """
                )
                connection.execute(
                    "INSERT INTO intentions (id, text, created_at) VALUES (?, ?, ?)",
                    ("legacy", "Existing intention", "2026-10-01T00:00:00+00:00"),
                )

            with override_settings(INTENTIONS_DB_PATH=str(database_path)):
                english = self.client.get(
                    "/api/intentions/?month=2026-10&language=en"
                ).json()
                chinese = self.client.get(
                    "/api/intentions/?month=2026-10&language=zh-TW"
                ).json()

            self.assertEqual([item["id"] for item in english["intentions"]], ["legacy"])
            self.assertEqual(chinese["intentions"], [])
