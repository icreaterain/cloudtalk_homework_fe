import { HttpLink } from 'apollo-angular/http';
import { ApolloClientOptions, InMemoryCache, fromPromise } from '@apollo/client/core';
import { onError } from '@apollo/client/link/error';
import { APOLLO_OPTIONS, ApolloModule } from 'apollo-angular';
import { EnvironmentProviders, importProvidersFrom, makeEnvironmentProviders } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth/auth.service';

interface EdgeList {
  edges?: { cursor: string }[];
}

function paginatedMerge(
  existing: EdgeList | undefined,
  incoming: EdgeList,
  { args }: { args?: Record<string, unknown> | null },
): EdgeList {
  if (!existing || !args?.['after']) return incoming;
  return {
    ...incoming,
    edges: [...(existing.edges ?? []), ...(incoming.edges ?? [])],
  };
}

export function provideApollo(): EnvironmentProviders {
  return makeEnvironmentProviders([
    importProvidersFrom(ApolloModule),
    {
      provide: APOLLO_OPTIONS,
      useFactory(
        httpLink: HttpLink,
        authService: AuthService,
        router: Router,
      ): ApolloClientOptions<unknown> {
        const graphqlUrl =
          (window as Window & { __env?: { GRAPHQL_URL?: string } }).__env?.GRAPHQL_URL ??
          'http://localhost:3000/graphql';

        // GraphQL always returns HTTP 200; auth errors live in errors[].extensions.
        // The HTTP errorInterceptor never fires for these, so we handle them here.
        const authErrorLink = onError(({ graphQLErrors, operation, forward }) => {
          const isUnauthorized = graphQLErrors?.some(
            (e) =>
              e.extensions?.['code'] === 'UNAUTHORIZED' ||
              (e.extensions?.['statusCode'] as number) === 401,
          );

          // Guard against infinite retry loops if the refreshed token is also rejected.
          const alreadyRetried = operation.getContext()['refreshAttempted'] as boolean;

          if (!isUnauthorized || alreadyRetried) {
            return;
          }

          return fromPromise(firstValueFrom(authService.refresh(), { defaultValue: null })).flatMap(
            (result) => {
              if (!result) {
                // Refresh failed — session was already cleared by AuthService.
                void router.navigate(['/auth/login']);
                return forward(operation);
              }
              operation.setContext({ refreshAttempted: true });
              return forward(operation);
            },
          );
        });

        return {
          link: authErrorLink.concat(httpLink.create({ uri: graphqlUrl })),
          cache: new InMemoryCache({
            typePolicies: {
              Query: {
                fields: {
                  products: {
                    keyArgs: ['filter'],
                    merge: paginatedMerge,
                  },
                },
              },
              Product: {
                fields: {
                  reviews: {
                    keyArgs: ['sort', 'filterByRating'],
                    merge: paginatedMerge,
                  },
                },
              },
            },
          }),
          defaultOptions: {
            watchQuery: {
              fetchPolicy: 'cache-and-network',
              errorPolicy: 'all',
            },
          },
        };
      },
      deps: [HttpLink, AuthService, Router],
    },
  ]);
}
