from django.urls import path

from .oauth_views import IdentityListView, IdentityUnlinkView, OAuthCallbackView, OAuthLinkStartView, OAuthStartView
from .audit_views import AuditEventExportView, AuditSummaryView, MemberSessionsRevokeView, OrgSessionListView, OrgSessionRevokeView
from .views import AcceptTermsView, AuditEventListView, CookieTokenRefreshView, DeactivateMeView, GoogleAuthView, InviteStaffView, LogoutView, MemberVisitHostView, MeView, RevokeInvitationView, RevokeMemberView, TeamAccessView

urlpatterns = [
    path("google/", GoogleAuthView.as_view(), name="auth-google"),
    path("identities/", IdentityListView.as_view(), name="auth-identities"),
    path("identities/<str:provider>/", IdentityUnlinkView.as_view(), name="auth-identity-unlink"),
    path("<str:provider>/start/", OAuthStartView.as_view(), name="auth-oauth-start"),
    path("<str:provider>/link/", OAuthLinkStartView.as_view(), name="auth-oauth-link"),
    path("<str:provider>/callback/", OAuthCallbackView.as_view(), name="auth-oauth-callback"),
    path("token/refresh/", CookieTokenRefreshView.as_view(), name="token-refresh"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("me/", MeView.as_view(), name="auth-me"),
    path("accept-terms/", AcceptTermsView.as_view(), name="auth-accept-terms"),
    path("me/deactivate/", DeactivateMeView.as_view(), name="auth-me-deactivate"),
    path("invite/", InviteStaffView.as_view(), name="auth-invite"),
    path("team/", TeamAccessView.as_view(), name="auth-team"),
    path("team/invitations/<uuid:invitation_id>/revoke/", RevokeInvitationView.as_view(), name="auth-revoke-invitation"),
    path("team/members/<uuid:user_id>/revoke/", RevokeMemberView.as_view(), name="auth-revoke-member"),
    path("team/members/<uuid:user_id>/visit-host/", MemberVisitHostView.as_view(), name="auth-member-visit-host"),
    path("audit/", AuditEventListView.as_view(), name="auth-audit"),
    path("audit/export/", AuditEventExportView.as_view(), name="auth-audit-export"),
    path("audit/summary/", AuditSummaryView.as_view(), name="auth-audit-summary"),
    path("sessions/", OrgSessionListView.as_view(), name="auth-sessions"),
    path("sessions/<uuid:session_id>/revoke/", OrgSessionRevokeView.as_view(), name="auth-session-revoke"),
    path("team/members/<uuid:user_id>/sessions/revoke/", MemberSessionsRevokeView.as_view(), name="auth-member-sessions-revoke"),
]
