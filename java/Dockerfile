FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY src/main/java ./src/main/java
RUN mkdir -p build && javac --release 21 --add-modules jdk.httpserver -d build src/main/java/com/veritas/prayers/PrayerApplication.java

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/build ./build
EXPOSE 8080
CMD ["java", "--add-modules", "jdk.httpserver", "-cp", "build", "com.veritas.prayers.PrayerApplication"]
