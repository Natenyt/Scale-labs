from rest_framework import permissions


class HasActiveOrganization(permissions.BasePermission):
    message = "Missing or invalid X-Org-Id (or set active org via POST /auth/me/active-org/)."

    def has_permission(self, request, view):
        org = getattr(request, "organization", None)
        return bool(org and request.user and request.user.is_authenticated)
