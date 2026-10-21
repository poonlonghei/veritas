from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.health, name="health"),
    path("intentions/", views.intentions, name="intentions"),
    path("intentions/<str:intention_id>/", views.intention_detail, name="intention-detail"),
]
