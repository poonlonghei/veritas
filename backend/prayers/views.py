from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .data import DAILY_REFLECTIONS, PRAYERS
from .mongodb import get_intentions_collection


def _mongo_error():
    return JsonResponse(
        {
            "error": "Prayer intentions are temporarily unavailable. Check that MongoDB is running and try again."
        },
        status=503,
    )


def _serialize_intention(document):
    return {
        "id": str(document["_id"]),
        "text": document["text"],
        "createdAt": document["createdAt"].isoformat(),
    }


@require_http_methods(["GET"])
def prayers(request):
    category = request.GET.get("category")
    query = request.GET.get("q", "").strip().casefold()
    results = PRAYERS
    if category and category != "All":
        results = [prayer for prayer in results if prayer["category"] == category]
    if query:
        results = [
            prayer
            for prayer in results
            if query in prayer["title"].casefold()
            or query in prayer["category"].casefold()
            or query in prayer["description"].casefold()
        ]
    return JsonResponse({"prayers": results})


@require_http_methods(["GET"])
def daily(request):
    today = datetime.now(timezone.utc).date()
    reflection = DAILY_REFLECTIONS[today.toordinal() % len(DAILY_REFLECTIONS)]
    prayer = PRAYERS[today.toordinal() % len(PRAYERS)]
    return JsonResponse(
        {
            "date": today.isoformat(),
            "reflection": reflection,
            "prayer": prayer,
        }
    )


@csrf_exempt
@require_http_methods(["GET", "POST"])
def intentions(request):
    text = None
    if request.method == "POST":
        import json

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
        collection = get_intentions_collection()
        if request.method == "GET":
            documents = collection.find().sort("createdAt", -1).limit(50)
            return JsonResponse(
                {"intentions": [_serialize_intention(item) for item in documents]}
            )

        document = {"text": text.strip(), "createdAt": datetime.now(timezone.utc)}
        result = collection.insert_one(document)
        document["_id"] = result.inserted_id
        return JsonResponse({"intention": _serialize_intention(document)}, status=201)
    except Exception as error:
        from pymongo.errors import PyMongoError

        if isinstance(error, PyMongoError):
            return _mongo_error()
        raise


@csrf_exempt
@require_http_methods(["DELETE"])
def intention_detail(request, intention_id):
    try:
        object_id = ObjectId(intention_id)
    except (InvalidId, TypeError):
        return JsonResponse({"error": "That intention could not be found."}, status=404)

    try:
        result = get_intentions_collection().delete_one({"_id": object_id})
    except Exception as error:
        from pymongo.errors import PyMongoError

        if isinstance(error, PyMongoError):
            return _mongo_error()
        raise
    if result.deleted_count == 0:
        return JsonResponse({"error": "That intention could not be found."}, status=404)
    return JsonResponse({"deleted": True})
