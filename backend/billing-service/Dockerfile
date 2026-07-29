FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Copy parent POM and all module source codes
COPY pom.xml .
COPY common ./common
COPY gateway-service ./gateway-service
COPY patient-service ./patient-service
COPY doctor-service ./doctor-service
COPY appointment-service ./appointment-service
COPY billing-service ./billing-service

# Build only the billing-service module
RUN mvn -f pom.xml -pl billing-service -am clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/billing-service/target/*.jar app.jar
EXPOSE 8088
EXPOSE 9090
ENTRYPOINT ["java", "-jar", "app.jar"]
