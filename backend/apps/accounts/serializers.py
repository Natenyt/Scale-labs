from __future__ import annotations

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils.text import slugify
from rest_framework import serializers

from apps.accounts.models import (
    MembershipRole,
    Organization,
    OrganizationKind,
    OrganizationMembership,
    User,
)


class OrganizationSummarySerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = ("id", "name", "slug", "kind", "role")

    def get_role(self, obj: Organization) -> str:
        # MeSerializer may pass ``role_user`` because ``request.user`` is still
        # anonymous during registration before JWT is returned.
        user = self.context.get("role_user")
        if user is None:
            req = self.context.get("request")
            user = getattr(req, "user", None) if req else None
        if not user or not getattr(user, "is_authenticated", False):
            return ""
        m = OrganizationMembership.objects.filter(
            user=user, organization=obj
        ).first()
        return m.role if m else ""


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value: str) -> str:
        email = value.lower().strip()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("This email is already registered.")
        return value

    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(required=False, allow_blank=True, default="")
    last_name = serializers.CharField(required=False, allow_blank=True, default="")
    account_type = serializers.ChoiceField(
        choices=["individual", "organization"],
    )
    organization_name = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Required when account_type=organization",
    )

    def validate(self, attrs):
        if attrs["account_type"] == "organization" and not (
            attrs.get("organization_name") or ""
        ).strip():
            raise serializers.ValidationError(
                {"organization_name": "Required for organization accounts."},
            )
        email = str(attrs["email"]).lower().strip()
        password = attrs["password"]
        try:
            validate_password(password, User(email=email))
        except DjangoValidationError as exc:
            msgs = list(getattr(exc, "messages", ()) or ())
            if not msgs:
                msgs = [str(exc)]
            raise serializers.ValidationError({"password": msgs}) from exc
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        email = validated_data["email"].lower().strip()
        password = validated_data["password"]
        account_type = validated_data["account_type"]

        user = User.objects.create_user(
            email=email,
            password=password,
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
        )

        if account_type == "individual":
            base = email.split("@")[0] or "user"
            org_name = f"{base}'s workspace"
            slug_base = slugify(base) or "workspace"
            kind = OrganizationKind.PERSONAL
        else:
            org_name = validated_data["organization_name"].strip()
            slug_base = slugify(org_name) or "org"
            kind = OrganizationKind.COMPANY

        slug = slug_base
        n = 0
        while Organization.objects.filter(slug=slug).exists():
            n += 1
            slug = f"{slug_base}-{n}"

        org = Organization.objects.create(name=org_name, slug=slug, kind=kind)
        OrganizationMembership.objects.create(
            user=user,
            organization=org,
            role=MembershipRole.OWNER,
        )
        user.last_active_organization = org
        user.save(update_fields=["last_active_organization"])
        return user


class MeSerializer(serializers.ModelSerializer):
    organizations = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "last_active_organization",
            "organizations",
        )

    def get_organizations(self, obj: User):
        qs = Organization.objects.filter(memberships__user=obj).distinct()
        ctx = {**self.context, "role_user": obj}
        return OrganizationSummarySerializer(qs, many=True, context=ctx).data


class SetActiveOrgSerializer(serializers.Serializer):
    organization_id = serializers.IntegerField()

    def validate_organization_id(self, value):
        user = self.context["request"].user
        if not OrganizationMembership.objects.filter(
            user=user, organization_id=value
        ).exists():
            raise serializers.ValidationError("Not a member of this organization.")
        return value
