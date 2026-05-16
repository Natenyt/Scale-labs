from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def health(_request):
    return JsonResponse({"status": "ok", "service": "scale-labs-api"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", health, name="health"),
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/", include("apps.studio.urls")),
]
