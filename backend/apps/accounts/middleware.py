"""
Resolve ``request.user`` before org middleware so Bearer JWT works with
``ActiveOrganizationMiddleware`` (Django auth middleware does not parse JWT).
"""

from __future__ import annotations

from typing import Callable

from django.http import HttpRequest, HttpResponse
from rest_framework.request import Request
from rest_framework_simplejwt.authentication import JWTAuthentication


class ApiUserMiddleware:
    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]):
        self.get_response = get_response
        self._jwt = JWTAuthentication()

    def __call__(self, request: HttpRequest) -> HttpResponse:
        if request.user.is_authenticated:
            return self.get_response(request)

        drf_request = Request(request)
        try:
            auth = self._jwt.authenticate(drf_request)
        except Exception:
            auth = None
        if auth is not None:
            user, _ = auth
            request.user = user

        return self.get_response(request)
