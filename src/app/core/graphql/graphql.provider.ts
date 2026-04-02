import { HttpLink } from 'apollo-angular/http';
import { ApolloClientOptions, InMemoryCache } from '@apollo/client/core';
import { APOLLO_OPTIONS, ApolloModule } from 'apollo-angular';
import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

interface ReviewEdge {
  cursor: string;
}

interface ReviewConnection {
  edges?: ReviewEdge[];
}

export function provideApollo(): EnvironmentProviders {
  return makeEnvironmentProviders([
    ApolloModule,
    {
      provide: APOLLO_OPTIONS,
      useFactory(httpLink: HttpLink): ApolloClientOptions<unknown> {
        const graphqlUrl =
          (window as Window & { __env?: { GRAPHQL_URL?: string } }).__env?.GRAPHQL_URL ??
          'http://localhost:3000/graphql';

        return {
          link: httpLink.create({ uri: graphqlUrl }),
          cache: new InMemoryCache({
            typePolicies: {
              Product: {
                fields: {
                  reviews: {
                    keyArgs: ['sort', 'filterByRating'],
                    merge(
                      existing: ReviewConnection | undefined,
                      incoming: ReviewConnection,
                      { args }: { args?: Record<string, unknown> | null },
                    ): ReviewConnection {
                      if (!existing || !args?.['after']) {
                        return incoming;
                      }
                      return {
                        ...incoming,
                        edges: [...(existing.edges ?? []), ...(incoming.edges ?? [])],
                      };
                    },
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
      deps: [HttpLink],
    },
  ]);
}
