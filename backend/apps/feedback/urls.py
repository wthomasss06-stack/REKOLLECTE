from django.urls import path

from apps.analytics.views import PlatformTrafficView

from .views import PlatformAdminLoginView, PlatformAuditListView, PlatformFeedbackDetailView, PlatformFeedbackListView, PlatformMemberDetailView, PlatformMemberListView, PlatformOrganizationDetailView, PlatformOrganizationListView, PlatformOverviewView, PublicFeedbackView

urlpatterns = [
    path("feedback/", PublicFeedbackView.as_view(), name="feedback-create"),
    path("admin/login/", PlatformAdminLoginView.as_view(), name="platform-admin-login"),
    path("admin/overview/", PlatformOverviewView.as_view(), name="platform-admin-overview"),
    path("admin/traffic/", PlatformTrafficView.as_view(), name="platform-admin-traffic"),
    path("admin/audit/", PlatformAuditListView.as_view(), name="platform-admin-audit"),
    path("admin/organizations/", PlatformOrganizationListView.as_view(), name="platform-admin-organizations"),
    path("admin/organizations/<uuid:organization_id>/", PlatformOrganizationDetailView.as_view(), name="platform-admin-organization-detail"),
    path("admin/members/", PlatformMemberListView.as_view(), name="platform-admin-members"),
    path("admin/members/<uuid:user_id>/", PlatformMemberDetailView.as_view(), name="platform-admin-member-detail"),
    path("admin/feedback/", PlatformFeedbackListView.as_view(), name="platform-admin-feedback"),
    path("admin/feedback/<uuid:feedback_id>/", PlatformFeedbackDetailView.as_view(), name="platform-admin-feedback-detail"),
]
