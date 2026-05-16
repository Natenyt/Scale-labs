from __future__ import annotations

from django.shortcuts import get_object_or_404

from apps.studio.serializers import _parse_ext_id


class ExternalIdLookupMixin:
    """DRF router `pk` may be `wf_12`, `ag_3`, `notion_4`."""

    ext_prefix: str = ""

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        raw = self.kwargs.get(self.lookup_field, "")
        rid = _parse_ext_id(self.ext_prefix, str(raw))
        if rid is None:
            from django.http import Http404

            raise Http404("Invalid id")
        return get_object_or_404(queryset, pk=rid)
