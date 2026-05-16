from __future__ import annotations

from rest_framework import generics, permissions, status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.accounts.models import User
from apps.accounts.serializers import (
    MeSerializer,
    RegisterSerializer,
    SetActiveOrgSerializer,
)


class RegisterView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request: Request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = ser.save()
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": MeSerializer(user, context={"request": request}).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]

    def post(self, request: Request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code != 200:
            return response
        email = request.data.get("email")
        if not email:
            return response
        try:
            user = User.objects.get(email__iexact=str(email).strip())
        except User.DoesNotExist:
            return response
        data = dict(response.data)
        data["user"] = MeSerializer(user, context={"request": request}).data
        return Response(data)


class MeView(generics.RetrieveAPIView):
    serializer_class = MeSerializer

    def get_object(self):
        return self.request.user


class SetActiveOrganizationView(APIView):
    def post(self, request: Request):
        ser = SetActiveOrgSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        user = request.user
        user.last_active_organization_id = ser.validated_data["organization_id"]
        user.save(update_fields=["last_active_organization"])
        return Response(
            MeSerializer(user, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )
