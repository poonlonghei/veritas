import json
import sqlite3
from uuid import UUID

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .intentions_store import create_intention, delete_intention, list_intentions


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
    text = None
    if request.method == "POST":
        try:
            payload = json.loads(request.body or b"{}")
        except (json.JSONDecodeError, UnicodeDecodeError):
            return JsonResponse({"error": "Request body must be valid JSON."}, status=400)

        if not isinstance(payload, dict):
            return JsonResponse({"error": "Request body must be a JSON object."}, status=400)

        text = payload.get("text")
        if not isinstance(text, str) or not text.strip():
            return JsonResponse(
                {"error": "Please write an intention before saving."}, status=400
            )
        if len(text.strip()) > 500:
            return JsonResponse(
                {"error": "Intentions must be 500 characters or fewer."}, status=400
            )

    try:
        if request.method == "GET":
            return JsonResponse({"intentions": list_intentions()})
        intention = create_intention(text.strip())
        return JsonResponse({"intention": intention}, status=201)
    except sqlite3.Error:
        return _storage_error()


@csrf_exempt
@require_http_methods(["DELETE"])
def intention_detail(request, intention_id):
    try:
        normalized_id = str(UUID(intention_id))
    except (ValueError, TypeError, AttributeError):
        return JsonResponse({"error": "That intention could not be found."}, status=404)

    try:
        deleted = delete_intention(normalized_id)
    except sqlite3.Error:
        return _storage_error()
    if not deleted:
        return JsonResponse({"error": "That intention could not be found."}, status=404)
    return JsonResponse({"deleted": True})
