# syntax=docker/dockerfile:1

FROM golang:1.27-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
ENV CGO_ENABLED=0
RUN go vet ./... && go test ./...
RUN go build -trimpath -ldflags="-s -w" -o /out/relay .

# Static binary on a base image with no shell and a non-root user.
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/relay /relay
EXPOSE 4433/udp 8082/tcp
USER nonroot:nonroot
HEALTHCHECK --interval=15s --timeout=4s --retries=5 CMD ["/relay", "-healthcheck"]
ENTRYPOINT ["/relay"]
