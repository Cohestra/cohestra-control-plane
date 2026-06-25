# Build context = examples/flink-job
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /build
COPY pom.xml .
RUN mvn -B -q dependency:go-offline || true
COPY src ./src
RUN mvn -B -q package

# Application-mode image: the operator runs the jar staged under /opt/flink/usrlib.
FROM flink:2.2
COPY --from=build /build/target/wiki-edit-count.jar /opt/flink/usrlib/job.jar
