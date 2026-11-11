# Conception de HelpDesk IT

Schémas UML du projet. Ils sont écrits en [Mermaid](https://mermaid.js.org/) : GitHub les affiche
directement et ils se versionnent avec le code.

| # | Schéma | Question à laquelle il répond |
|---|---|---|
| 1 | [Cas d'utilisation](#1-cas-dutilisation) | Qui fait quoi avec le système ? |
| 2 | [Architecture et déploiement](#2-architecture-et-déploiement) | Quels services, quelles bases, comment communiquent-ils ? |
| 3 | [Diagrammes de classes](#3-diagrammes-de-classes) | Quel est le modèle métier de chaque service ? |
| 4 | [Modèle relationnel](#4-modèle-relationnel-des-deux-bases) | Quelles tables, quelles clés ? |
| 5 | [Diagrammes de séquence](#5-diagrammes-de-séquence) | Que se passe-t-il, étape par étape, à la création et à la résolution d'un ticket ? |
| 6 | [Diagrammes d'états](#6-diagrammes-détats) | Quel est le cycle de vie d'un ticket et d'un technicien ? |

---

## 1. Cas d'utilisation

Trois acteurs humains. Le système agit aussi de lui-même (répartition, suivi des délais, audit).

```mermaid
flowchart LR
    U(["👤 Utilisateur"])
    T(["🔧 Technicien"])
    A(["🛡️ Administrateur"])

    subgraph SYS["HelpDesk IT"]
        direction TB
        subgraph UC_U["Signaler et suivre"]
            U1["Signaler un incident<br/>(type de panne, priorité)"]
            U2["Suivre l'état de ses tickets"]
            U3["Échanger avec le technicien<br/>(commentaires)"]
        end
        subgraph UC_T["Traiter"]
            T1["Consulter son ticket en cours"]
            T2["Confirmer la résolution"]
            T3["Consulter son tableau de bord"]
        end
        subgraph UC_A["Piloter"]
            A1["Voir tous les tickets<br/>et la file d'attente"]
            A2["Suivre l'équipe<br/>(occupé ou disponible)"]
            A3["Consulter statistiques<br/>et graphiques"]
            A4["Consulter le journal d'activité"]
        end
        subgraph UC_S["Automatismes du système"]
            S1["Répartir les tickets<br/>aux techniciens libres"]
            S2["Calculer l'échéance SLA<br/>et détecter les retards"]
            S3["Tenir la piste d'audit"]
            S4["Envoyer les notifications"]
        end
    end

    U --- U1 & U2 & U3
    T --- T1 & T2 & T3 & U3
    A --- A1 & A2 & A3 & A4 & U3

    U1 -. déclenche .-> S1
    T2 -. déclenche .-> S1
    S1 -. déclenche .-> S4
    U1 -. déclenche .-> S2
    T2 -. déclenche .-> S2
    S2 -. alimente .-> S3
```

**Règles de confidentialité.** Un ticket est un échange **privé** entre son auteur et le technicien
assigné. Seul l'administrateur voit tous les tickets ; un technicien ne voit jamais ceux de ses
collègues, pas même ceux en attente.

---

## 2. Architecture et déploiement

Deux services indépendants, chacun avec **sa propre base**, qui communiquent par une API REST
protégée par une clé. Tout démarre avec `docker compose up`.

```mermaid
flowchart TB
    NAV(["🌐 Navigateur"])

    subgraph DOCKER["Docker Compose"]
        direction TB
        FRONT["<b>frontend</b><br/>Next.js 16 · React<br/>:3000"]

        subgraph TICKETS["Gestion des tickets"]
            DJANGO["<b>ticket-service</b><br/>Django REST · JWT · gunicorn<br/>:8000"]
            PG[("<b>PostgreSQL 17</b><br/>utilisateurs, tickets,<br/>commentaires, notifications")]
        end

        subgraph SLA["Suivi des délais"]
            SPRING["<b>sla-service</b><br/>Java 21 · Spring Boot<br/>:8081"]
            ORA[("<b>Oracle</b><br/>suivi SLA, audit<br/>+ fonction PL/SQL")]
        end
    end

    NAV -->|"pages"| FRONT
    NAV -->|"API REST + jeton JWT<br/>(CORS limité à l'interface)"| DJANGO
    DJANGO --> PG
    DJANGO -->|"événements « ticket créé / résolu »<br/>REST + en-tête X-API-Key"| SPRING
    DJANGO -->|"lecture du SLA et des statistiques<br/>(la clé reste côté serveur)"| SPRING
    SPRING --> ORA

    subgraph CI["GitHub"]
        GHA["GitHub Actions<br/>tests · test de bout en bout"]
        GHCR["ghcr.io<br/>3 images Docker"]
    end
    GHA -->|"publie (branche main)"| GHCR
```

**Choix de conception.**
- Le **navigateur ne connaît jamais la clé** du service SLA : il passe par Django, qui la détient.
- Si Spring Boot est arrêté, **Django continue** : un ticket se crée quand même (seul le suivi SLA est
  momentanément absent).
- Les deux bases ne sont exposées que sur `127.0.0.1`.

---

## 3. Diagrammes de classes

### 3.1 Service Django (`ticket-service`)

```mermaid
classDiagram
    direction LR

    class User {
        +int id
        +String username
        +String email
        +Role role
    }
    class Ticket {
        +int id
        +String title
        +String description
        +Category category
        +Priority priority
        +Status status
        +DateTime created_at
        +DateTime updated_at
        +DateTime resolved_at
    }
    class TicketEvent {
        +int id
        +EventType event_type
        +DateTime created_at
    }
    class Comment {
        +int id
        +String content
        +DateTime created_at
    }
    class Notification {
        +int id
        +String message
        +bool is_read
        +DateTime created_at
    }

    class Role {
        <<enumeration>>
        USER
        TECHNICIAN
        ADMIN
    }
    class Priority {
        <<enumeration>>
        CRITICAL
        HIGH
        MEDIUM
        LOW
    }
    class Status {
        <<enumeration>>
        OPEN
        IN_PROGRESS
        RESOLVED
    }
    class Category {
        <<enumeration>>
        HARDWARE
        NETWORK
        SOFTWARE
        ACCESS
        OTHER
    }
    class EventType {
        <<enumeration>>
        CREATED
        ASSIGNED
        RESOLVED
        COMMENTED
    }

    User "1" --> "*" Ticket : crée
    User "0..1" --> "*" Ticket : traite
    Ticket "1" *-- "*" TicketEvent : journal
    Ticket "1" *-- "*" Comment
    Ticket "1" *-- "*" Notification
    User "1" --> "*" TicketEvent : acteur
    User "1" --> "*" Comment : auteur
    User "1" --> "*" Notification : destinataire

    User ..> Role
    Ticket ..> Priority
    Ticket ..> Status
    Ticket ..> Category
    TicketEvent ..> EventType
```

Le statut `CLOSED` existe dans le code mais n'est pas utilisé : un ticket s'arrête à `RESOLVED`.
Un ticket `OPEN` **sans technicien assigné** est « en attente » dans la file. La répartition choisit les tickets
urgents d'abord, puis les plus anciens ; chaque technicien traite un seul ticket à la fois.

### 3.2 Service Spring Boot (`sla-service`)

```mermaid
classDiagram
    direction LR

    class Priority {
        <<enumeration>>
        CRITICAL
        HIGH
        MEDIUM
        LOW
        +slaDuration() Duration
    }
    class TicketSla {
        +Long id
        +Long ticketId
        +Priority priority
        +Instant createdAt
        +Instant deadline
        +Instant resolvedAt
        +isResolved() boolean
        +isBreached(now) boolean
    }
    class AuditLog {
        +Long id
        +String eventType
        +Long ticketId
        +String details
        +Instant occurredAt
    }
    class SlaService {
        +onTicketCreated()
        +onTicketResolved()
        +overdue() List
        +complianceRate() Double
    }
    class TicketSlaRepository {
        <<interface>>
    }
    class AuditLogRepository {
        <<interface>>
    }
    class EventController
    class SlaController
    class ApiKeyFilter

    TicketSla ..> Priority
    SlaService --> TicketSlaRepository
    SlaService --> AuditLogRepository
    TicketSlaRepository ..> TicketSla
    AuditLogRepository ..> AuditLog
    EventController --> SlaService : reçoit les événements
    SlaController --> SlaService : consultation
    ApiKeyFilter ..> EventController : protège /api/**
    ApiKeyFilter ..> SlaController : protège /api/**
```

Délais par priorité (`Priority.slaDuration()`) : critique 4 h, haute 8 h, moyenne 24 h, basse 72 h.

`ticketId` est l'identifiant du ticket **côté Django** : les deux services n'ont volontairement
**aucune clé étrangère commune** (bases séparées), seulement cette référence logique.
`isBreached` compare la date de résolution (ou « maintenant » si le ticket est ouvert) à l'échéance.

---

## 4. Modèle relationnel des deux bases

```mermaid
erDiagram
    accounts_user ||--o{ tickets_ticket : "created_by (PROTECT)"
    accounts_user |o--o{ tickets_ticket : "assigned_to (SET NULL)"
    tickets_ticket ||--o{ tickets_ticketevent : "CASCADE"
    tickets_ticket ||--o{ tickets_comment : "CASCADE"
    tickets_ticket ||--o{ tickets_notification : "CASCADE"
    accounts_user ||--o{ tickets_ticketevent : "actor (PROTECT)"
    accounts_user ||--o{ tickets_comment : "author (PROTECT)"
    accounts_user ||--o{ tickets_notification : "recipient (CASCADE)"

    accounts_user {
        bigint id PK
        varchar username UK
        varchar password "haché"
        varchar role "USER, TECHNICIAN, ADMIN"
    }
    tickets_ticket {
        bigint id PK
        varchar title
        text description
        varchar category
        varchar priority
        varchar status
        bigint created_by_id FK
        bigint assigned_to_id FK "nullable"
        timestamptz created_at
        timestamptz updated_at
        timestamptz resolved_at "nullable"
    }
    tickets_ticketevent {
        bigint id PK
        bigint ticket_id FK
        bigint actor_id FK
        varchar event_type
        timestamptz created_at
    }
    tickets_comment {
        bigint id PK
        bigint ticket_id FK
        bigint author_id FK
        text content
        timestamptz created_at
    }
    tickets_notification {
        bigint id PK
        bigint recipient_id FK
        bigint ticket_id FK
        varchar message
        boolean is_read
        timestamptz created_at
    }
```

**Base PostgreSQL ci-dessus (Django).** `PROTECT` interdit de supprimer un utilisateur qui a des
tickets (historique préservé) ; `CASCADE` supprime avec le ticket ses événements, commentaires
et notifications ; `SET NULL` libère le ticket si son technicien est supprimé.

```mermaid
erDiagram
    TICKET_SLA {
        number id PK
        number ticket_id UK "référence logique vers Django"
        varchar2 priority "CRITICAL, HIGH, MEDIUM, LOW"
        timestamp_tz created_at
        timestamp_tz deadline "created_at + délai de la priorité"
        timestamp_tz resolved_at "nullable"
    }
    AUDIT_LOG {
        number id PK
        varchar2 event_type "TICKET_CREATED, TICKET_RESOLVED"
        number ticket_id "référence logique vers Django"
        varchar2 details
        timestamp_tz occurred_at
    }
```

**Base Oracle ci-dessus (Spring Boot).** `timestamp_tz` désigne `TIMESTAMP(9) WITH TIME ZONE`, le type créé par Hibernate pour un `Instant` Java. `ticket_id` est unique dans `TICKET_SLA` : la base
refuse un doublon, ce qui rend la réception d'un même événement deux fois sans danger.
La fonction PL/SQL `sla_compliance_rate(priorité)` calcule le pourcentage de tickets résolus
dans les délais directement dans Oracle.

---

## 5. Diagrammes de séquence

### 5.1 Création d'un ticket

```mermaid
sequenceDiagram
    autonumber
    actor U as Utilisateur
    participant F as Frontend (Next.js)
    participant D as Django (API)
    participant P as PostgreSQL
    participant S as Spring Boot
    participant O as Oracle
    actor T as Technicien libre

    U->>F: remplit le formulaire
    F->>D: POST /api/tickets (jeton JWT)
    D->>D: valide, force created_by = utilisateur connecté
    D->>P: INSERT ticket (OPEN) + événement CREATED
    D->>S: POST /api/events/ticket-created (X-API-Key)
    S->>O: INSERT ticket_sla (échéance) + audit_log
    S-->>D: 201
    Note over D,S: Si Spring Boot ne répond pas en 3 s,<br/>l'erreur est journalisée et le ticket est créé quand même.

    D->>D: dispatch_waiting()
    alt un technicien est libre
        D->>P: ticket IN_PROGRESS, assigné au technicien le moins sollicité
        D->>P: notifications (technicien et auteur)
        D-->>F: 201 (statut IN_PROGRESS)
        T-->>F: voit le bandeau « ticket attribué » (rafraîchi toutes les 8 s)
    else tous les techniciens sont occupés
        D-->>F: 201 (statut OPEN, en file d'attente)
    end
    F-->>U: affiche le ticket
```

### 5.2 Résolution d'un ticket et attribution du suivant

```mermaid
sequenceDiagram
    autonumber
    actor T as Technicien
    participant F as Frontend
    participant D as Django (API)
    participant P as PostgreSQL
    participant S as Spring Boot
    participant O as Oracle
    actor U as Auteur du ticket
    actor T2 as Prochain ticket en attente

    T->>F: « Confirmer la résolution »
    F->>D: POST /api/tickets/{id}/resolve
    D->>D: ticket en cours ? technicien = assigné (ou admin) ?
    alt refusé
        D-->>F: 400 (pas en cours) ou 404 (ticket d'un autre)
    else accepté
        D->>P: status RESOLVED, resolved_at, événement RESOLVED
        D->>S: POST /api/events/ticket-resolved
        S->>O: UPDATE resolved_at + audit « délai respecté » ou « NON respecté »
        D->>P: notification pour l'auteur
        D->>D: dispatch_waiting()
        Note over D: le technicien est libre :<br/>le ticket en attente le plus urgent<br/>(puis le plus ancien) lui est attribué
        D->>P: ticket suivant IN_PROGRESS + notifications
        D-->>F: 200
        U-->>F: voit « votre ticket a été résolu »
        T2-->>F: voit « un ticket vous a été attribué »
    end
```

### 5.3 Consultation du taux de SLA par l'administrateur

```mermaid
sequenceDiagram
    autonumber
    actor A as Administrateur
    participant F as Frontend
    participant D as Django (API)
    participant P as PostgreSQL
    participant S as Spring Boot
    participant O as Oracle

    A->>F: ouvre « Vue d'ensemble »
    F->>D: GET /api/admin/stats (jeton JWT, rôle ADMIN)
    D->>P: totaux, répartitions, 14 jours d'historique
    D->>S: GET /api/sla/stats (X-API-Key)
    S->>O: SELECT sla_compliance_rate(NULL) FROM dual
    O-->>S: 66.7
    S-->>D: { open, overdue, complianceRate }
    D-->>F: statistiques combinées
    Note over F: la page se rafraîchit toutes les 15 s
```

---

## 6. Diagrammes d'états

### 6.1 Cycle de vie d'un ticket

```mermaid
stateDiagram-v2
    [*] --> EnAttente : création, aucun technicien libre
    [*] --> EnCours : création, un technicien est libre

    EnAttente : En attente (OPEN, non assigné)
    EnCours : En cours (IN_PROGRESS)
    Resolu : Résolu (RESOLVED)

    EnAttente --> EnCours : un technicien se libère
    EnCours --> Resolu : le technicien confirme la résolution
    Resolu --> [*]
```

### 6.2 Disponibilité d'un technicien

```mermaid
stateDiagram-v2
    [*] --> Disponible

    Disponible : Disponible (aucun ticket en cours)
    Occupe : Occupé (un seul ticket en cours)

    Disponible --> Occupe : un ticket lui est attribué
    Occupe --> Disponible : il confirme la résolution
    Occupe --> Occupe : jamais un second ticket
```
