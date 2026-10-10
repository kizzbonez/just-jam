// Fixed, obviously fake configuration for unit tests.
Object.assign(process.env, {
  DATABASE_URL: "postgresql://test:test@127.0.0.1:5432/test",
  AUTH_SECRET: "unit-test-auth-secret-0123456789abcdef",
  RELAY_SHARED_SECRET: "unit-test-relay-secret-0123456789abcdef",
  APP_URL: "http://127.0.0.1:3410",
  ALLOWED_ORIGINS: "https://jam.example.com",
  RELAY_PUBLIC_URL: "https://127.0.0.1:4433",
});
