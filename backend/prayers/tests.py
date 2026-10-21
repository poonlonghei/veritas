from unittest.mock import patch

from django.test import SimpleTestCase
from pymongo.errors import ServerSelectionTimeoutError


class PrayerApiTests(SimpleTestCase):
    def test_prayer_library_returns_prayers(self):
        response = self.client.get("/api/prayers/")

        self.assertEqual(response.status_code, 200)
        self.assertGreater(len(response.json()["prayers"]), 0)

    def test_prayer_library_filters_by_category_and_search(self):
        response = self.client.get("/api/prayers/?category=Marian&q=hail")

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["id"] for item in response.json()["prayers"]], ["hail-mary"])

    def test_daily_endpoint_returns_reflection_and_prayer(self):
        response = self.client.get("/api/daily/")

        self.assertEqual(response.status_code, 200)
        self.assertIn("reflection", response.json())
        self.assertIn("prayer", response.json())

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

    @patch(
        "prayers.views.get_intentions_collection",
        side_effect=ServerSelectionTimeoutError("MongoDB is unavailable"),
    )
    def test_intentions_report_database_unavailability(self, _mock_collection):
        response = self.client.get("/api/intentions/")

        self.assertEqual(response.status_code, 503)
        self.assertIn("MongoDB is running", response.json()["error"])
