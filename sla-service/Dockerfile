# ---- Étape 1 : compilation (image lourde, jetée ensuite) ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build

# Les dépendances d'abord : couche mise en cache tant que pom.xml ne change pas.
COPY pom.xml .
RUN mvn -q -B dependency:go-offline

COPY src ./src
# Les tests tournent dans le CI, pas à chaque construction d'image.
RUN mvn -q -B -DskipTests package

# ---- Étape 2 : exécution (image légère : JRE seul) ----
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Le serveur ne tourne pas en root.
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /build/target/*.jar app.jar
USER app

EXPOSE 8081
# MaxRAMPercentage : la JVM s'adapte à la mémoire du conteneur au lieu de celle de la machine.
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
