from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import RegisterSerializer


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(APIView):
    """Renvoie l'identité et le rôle de l'utilisateur connecté."""

    def get(self, request):
        user = request.user
        return Response(
            {"id": user.id, "username": user.username, "role": user.role}
        )
