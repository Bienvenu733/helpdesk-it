from django.urls import path
from rest_framework.routers import DefaultRouter

from .admin_views import AdminActivityView, AdminStatsView, AdminUsersView
from .notification_views import (
    NotificationListView,
    NotificationReadAllView,
    NotificationReadView,
    TechnicianStatsView,
)
from .views import TicketViewSet

router = DefaultRouter()
router.register("tickets", TicketViewSet, basename="ticket")

urlpatterns = [
    path("notifications/", NotificationListView.as_view(), name="notifications"),
    path("notifications/read-all/", NotificationReadAllView.as_view(), name="notifications-read-all"),
    path("notifications/<int:pk>/read/", NotificationReadView.as_view(), name="notification-read"),
    path("technician/stats/", TechnicianStatsView.as_view(), name="technician-stats"),
    path("admin/stats/", AdminStatsView.as_view(), name="admin-stats"),
    path("admin/users/", AdminUsersView.as_view(), name="admin-users"),
    path("admin/activity/", AdminActivityView.as_view(), name="admin-activity"),
] + router.urls
