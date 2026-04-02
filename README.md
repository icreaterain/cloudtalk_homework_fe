# Product Reviews Frontend

Angular 19 SPA consuming the Product Reviews API.

- GraphQL reads via Apollo Angular
- REST writes (auth, review mutations) via Angular HttpClient
- Tailwind CSS for styling
- Standalone components, Angular Signals for auth state
- graphql-codegen for typed Angular query services

## Quick Start

```bash
# From workspace root, start the backend first
cd ../cloudtalk_homework_be && pnpm run dev

# In a new terminal
cd cloudtalk_homework_fe
cp .env.example .env
pnpm install
pnpm run codegen     # generate typed GQL services from schema
pnpm start           # http://localhost:4200
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `API_URL` | `http://localhost:3000/api` | Backend REST base URL |
| `GRAPHQL_URL` | `http://localhost:3000/graphql` | Backend GraphQL endpoint |

## Scripts

| Script | Description |
|---|---|
| `pnpm start` | Dev server at `http://localhost:4200` |
| `pnpm run build` | Production build to `dist/` |
| `pnpm test` | Unit tests with Jest |
| `pnpm run lint` | ESLint (auto-fix) |
| `pnpm run lint:check` | ESLint (no fix, for CI) |
| `pnpm run format` | Prettier (auto-fix) |
| `pnpm run format:check` | Prettier (no fix, for CI) |
| `pnpm run codegen` | Run graphql-codegen to update `src/generated/` |

## Architecture

```
src/app/
  core/
    auth/             AuthService (signals), authGuard, authInterceptor
    graphql/          Apollo Client provider
    http/             errorInterceptor (silent refresh on 401)
  features/
    products/         ProductListComponent, ProductDetailComponent
    reviews/          ReviewListComponent, ReviewFormComponent, ReviewCardComponent,
                      ReviewCommandService (REST), MyReviewsComponent
    auth/             LoginComponent, RegisterComponent
  shared/
    components/       StarRatingComponent, LoadingSpinnerComponent,
                      ErrorMessageComponent, PaginationComponent
    models/           TypeScript interfaces for REST responses
    pipes/            TimeAgoPipe
  generated/          graphql-codegen output — gitignored; regenerate with `pnpm run codegen`
```

### API consumption

- **REST commands** (`HttpClient` + `authInterceptor`): auth flows, review create/update/delete
- **GraphQL reads** (`Apollo Angular` + codegen services): product list/detail, reviews, my-reviews

### Auth flow

1. On app init, `AuthService.initFromSession()` restores the access token from `sessionStorage`
2. `authInterceptor` attaches `Authorization: Bearer <token>` to all REST requests
3. `errorInterceptor` catches 401 responses and calls `POST /api/auth/refresh` (uses httpOnly cookie)
4. On successful refresh, the original request is retried with the new token
5. On refresh failure, the session is cleared and the user is redirected to `/auth/login`

### GraphQL codegen

The codegen pipeline reads `../cloudtalk_homework_be/schema.graphql` (relative path from workspace root) and `src/**/*.queries.ts` query documents, and generates typed services into `src/generated/graphql.ts`.

Run after any backend schema change:

```bash
# Export updated schema from backend first
cd ../cloudtalk_homework_be && pnpm run schema:export

# Then regenerate frontend types
cd ../cloudtalk_homework_fe && pnpm run codegen
```

## Implementation Phases

| Phase | Scope | Status |
|---|---|---|
| 6 | Scaffold (Angular, Apollo Angular, Tailwind, codegen, routing) | **Complete** |
| 7 | Auth flow (AuthService, interceptors, login/register UI) | **Complete** |
| 8 | Product list/detail, review list/form/card | **Complete** |
| 9 | CI/CD pipelines | **Complete** |
| 10 | Documentation | **Complete** |
