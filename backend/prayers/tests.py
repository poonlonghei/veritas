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

    def test_intentions_can_be_created_listed_and_deleted_from_sqlite(self):
        with tempfile.TemporaryDirectory() as directory:
            with override_settings(
                INTENTIONS_DB_PATH=str(Path(directory) / "intentions.sqlite3")
            ):
                created = self.client.post(
                    "/api/intentions/",
                    data='{"text":"Please pray for peace."}',
                    content_type="application/json",
                )

                self.assertEqual(created.status_code, 201)
                intention = created.json()["intention"]
                self.assertEqual(intention["text"], "Please pray for peace.")
                self.assertEqual(len(intention["id"]), 36)

                listed = self.client.get("/api/intentions/")
                self.assertEqual(listed.status_code, 200)
                self.assertEqual(listed.json()["intentions"], [intention])

                deleted = self.client.delete(
                    f"/api/intentions/{intention['id']}/"
                )
                self.assertEqual(deleted.status_code, 200)
                self.assertEqual(deleted.json(), {"deleted": True})
                self.assertEqual(
                    self.client.get("/api/intentions/").json()["intentions"], []
                )
