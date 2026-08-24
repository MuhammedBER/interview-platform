FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /workspace

COPY pom.xml ./
COPY api-gateway/pom.xml api-gateway/
COPY interview-service/pom.xml interview-service/
COPY notification-service/pom.xml notification-service/

RUN mvn -B -pl api-gateway dependency:go-offline

COPY api-gateway/src api-gateway/src
RUN mvn -B -pl api-gateway clean package -DskipTests

FROM eclipse-temurin:17-jre AS runtime
WORKDIR /app
COPY --from=build /workspace/api-gateway/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]