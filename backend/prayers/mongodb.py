from functools import lru_cache

from django.conf import settings
from pymongo import MongoClient


@lru_cache(maxsize=1)
def get_client():
    return MongoClient(settings.MONGODB_URI, serverSelectionTimeoutMS=2500)


def get_intentions_collection():
    client = get_client()
    client.admin.command("ping")
    return client[settings.MONGODB_DATABASE]["intentions"]
