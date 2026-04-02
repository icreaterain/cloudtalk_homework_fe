// Runtime environment configuration.
// This file is served as-is. The deploy pipeline overwrites it with production values.
// For local development the app falls back to localhost:3000 if __env is absent.
(function (window) {
  window.__env = {
    API_URL: 'http://localhost:3000/api',
    GRAPHQL_URL: 'http://localhost:3000/graphql',
  };
})(window);
