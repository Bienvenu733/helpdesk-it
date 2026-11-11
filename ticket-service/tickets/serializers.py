from rest_framework import serializers

from .models import Comment, Ticket


class CommentSerializer(serializers.ModelSerializer):
    author = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Comment
        fields = ["id", "author", "content", "created_at"]
        read_only_fields = ["id", "author", "created_at"]


class TicketSerializer(serializers.ModelSerializer):
    created_by = serializers.StringRelatedField(read_only=True)
    assigned_to = serializers.StringRelatedField(read_only=True)
    assigned_to_id = serializers.IntegerField(read_only=True)
    created_by_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = Ticket
        fields = [
            "id", "title", "description", "category", "priority", "status",
            "created_by", "created_by_id", "assigned_to", "assigned_to_id",
            "created_at", "updated_at", "resolved_at",
        ]
        # Ces champs sont gérés par le serveur, jamais par le client.
        read_only_fields = [
            "id", "status", "created_by", "created_by_id", "assigned_to", "assigned_to_id",
            "created_at", "updated_at", "resolved_at",
        ]
