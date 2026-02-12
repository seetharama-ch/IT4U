FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

COPY pom.xml .
RUN mvn -q -DskipTests dependency:go-offline

COPY . .
RUN mvn -q -DskipTests clean package

FROM eclipse-temurin:17-jre
WORKDIR /app

COPY --from=build /app/target/*.jar /app/app.jar

EXPOSE 8060
ENV JAVA_OPTS=""

ENTRYPOINT ["sh","-c","java $JAVA_OPTS -jar /app/app.jar"]
