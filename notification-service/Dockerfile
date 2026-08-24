FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /workspace

COPY pom.xml ./
COPY api-gateway/pom.xml api-gateway/
COPY interview-service/pom.xml interview-service/
COPY notification-service/pom.xml notification-service/

RUN mvn -B -pl notification-service dependency:go-offline

COPY notification-service/src notification-service/src
RUN mvn -B -pl notification-service clean package -DskipTests

FROM eclipse-temurin:17-jre AS runtime
WORKDIR /app
COPY --from=build /workspace/notification-service/target/*.jar app.jar
EXPOSE 8082
ENTRYPOINT ["java", "-jar", "/app/app.jar"]