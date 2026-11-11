from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    # write_only : le mot de passe est accepté en entrée, jamais renvoyé.
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["id", "username", "email", "password"]

    def create(self, validated_data):
        # create_user hache le mot de passe. Le rôle reste USER par défaut :
        # on ne laisse jamais quelqu'un choisir son rôle à l'inscription.
        return User.objects.create_user(**validated_data)
