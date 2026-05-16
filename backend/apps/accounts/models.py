from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractUser
from django.db import models


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("Email must be set")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        return self._create_user(email, password, **extra_fields)


class User(AbstractUser):
    """Email-based login."""

    username = None  # type: ignore[assignment]
    email = models.EmailField(unique=True)
    last_active_organization = models.ForeignKey(
        "accounts.Organization",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    objects = UserManager()

    def __str__(self) -> str:
        return self.email


class OrganizationKind(models.TextChoices):
    PERSONAL = "personal", "Personal"
    COMPANY = "company", "Company"


class Organization(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=80, unique=True)
    kind = models.CharField(
        max_length=20,
        choices=OrganizationKind.choices,
        default=OrganizationKind.PERSONAL,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        indexes = [models.Index(fields=["slug"])]

    def __str__(self) -> str:
        return f"{self.name} ({self.slug})"


class MembershipRole(models.TextChoices):
    OWNER = "owner", "Owner"
    ADMIN = "admin", "Admin"
    MEMBER = "member", "Member"


class OrganizationMembership(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    role = models.CharField(
        max_length=20,
        choices=MembershipRole.choices,
        default=MembershipRole.MEMBER,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("user", "organization")]
        indexes = [
            models.Index(fields=["organization", "user"]),
        ]

    def __str__(self) -> str:
        return f"{self.user.email} @ {self.organization.slug} ({self.role})"
