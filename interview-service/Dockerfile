FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /workspace

COPY pom.xml ./
COPY api-gateway/pom.xml api-gateway/
COPY interview-service/pom.xml interview-service/
COPY notification-service/pom.xml notification-service/

RUN mvn -B -pl interview-service dependency:go-offline

COPY interview-service/src interview-service/src
RUN mvn -B -pl interview-service clean package -DskipTests

FROM eclipse-temurin:17-jre AS runtime
WORKDIR /app
COPY --from=build /workspace/interview-service/target/*.jar app.jar
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "/app/app.jar"]