from django.urls import path

from . import views

urlpatterns = [
    path("prayers/", views.prayers, name="prayers"),
    path("daily/", views.daily, name="daily"),
    path("intentions/", views.intentions, name="intentions"),
    path("intentions/<str:intention_id>/", views.intention_detail, name="intention-detail"),
]
