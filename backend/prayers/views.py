import json
import sqlite3
from datetime import datetime, timezone

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .intentions_store import (
    create_intention,
    list_intention_months,
    list_intentions,
)

SUPPORTED_LANGUAGES = {"en", "zh-TW"}


@require_http_methods(["GET"])
def health(request):
    return JsonResponse({"status": "ok"})


def _storage_error():
    return JsonResponse(
        {
            "error": "Prayer intentions are temporarily unavailable. Check that the intentions database is writable and try again."
        },
        status=503,
    )


@csrf_exempt
@require_http_methods(["GET", "POST"])
def intentions(request):
    payload = {}
    if request.method == "POST":
        try:
            payload = json.loads(request.body or b"{}")
        except (json.JSONDecodeError, UnicodeDecodeError):
            return JsonResponse({"error": "Request body must be valid JSON."}, status=400)

        if not isinstance(payload, dict):
            return JsonResponse({"error": "Request body must be a JSON object."}, status=400)

        text = payload.get("text")
        name = payload.get("name")
        location = payload.get("location")
        language = payload.get("language")
        if not isinstance(text, str) or not text.strip():
            return JsonResponse(
                {"error": "Please write an intention before saving."}, status=400
            )
        if len(text.strip()) > 500:
            return JsonResponse(
                {"error": "Intentions must be 500 characters or fewer."}, status=400
            )
        if not isinstance(name, str) or not name.strip():
            return JsonResponse(
                {"error": "Please enter your name before sharing an intention."},
                status=400,
            )
        if len(name.strip()) > 100:
            return JsonResponse(
                {"error": "Names must be 100 characters or fewer."}, status=400
            )
        if not isinstance(location, str) or not location.strip():
            return JsonResponse(
                {"error": "Please enter your location before sharing an intention."},
                status=400,
            )
        if len(location.strip()) > 100:
            return JsonResponse(
                {"error": "Locations must be 100 characters or fewer."}, status=400
            )
        if payload.get("consent") is not True:
            return JsonResponse(
                {"error": "Consent is required before publishing an intention."},
                status=400,
            )
        if not isinstance(language, str) or language not in SUPPORTED_LANGUAGES:
            return JsonResponse(
                {"error": "Language must be 'en' or 'zh-TW'."}, status=400
            )

    try:
        if request.method == "GET":
            month = request.GET.get("month") or datetime.now(timezone.utc).strftime("%Y-%m")
            language = request.GET.get("language", "en")
            if not isinstance(language, str) or language not in SUPPORTED_LANGUAGES:
                return JsonResponse(
                    {"error": "Language must be 'en' or 'zh-TW'."}, status=400
                )
            try:
                parsed_month = datetime.strptime(month, "%Y-%m")
            except (TypeError, ValueError):
                return JsonResponse(
                    {"error": "Month must use the YYYY-MM format."}, status=400
                )
            if parsed_month.strftime("%Y-%m") != month:
                return JsonResponse(
                    {"error": "Month must use the YYYY-MM format."}, status=400
                )
            return JsonResponse(
                {
                    "month": month,
                    "language": language,
                    "months": list_intention_months(language),
                    "intentions": list_intentions(month, language),
                }
            )
        intention = create_intention(
            text.strip(), name.strip(), location.strip(), language
        )
        return JsonResponse({"intention": intention}, status=201)
    except sqlite3.Error:
        return _storage_error()
