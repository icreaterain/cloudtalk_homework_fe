import { HttpLink } from 'apollo-angular/http';
import { ApolloClientOptions, InMemoryCache } from '@apollo/client/core';
import { APOLLO_OPTIONS, ApolloModule } from 'apollo-angular';
import { EnvironmentProviders, importProvidersFrom, makeEnvironmentProviders } from '@angular/core';

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
      useFactory(httpLink: HttpLink): ApolloClientOptions<unknown> {
        const graphqlUrl =
          (window as Window & { __env?: { GRAPHQL_URL?: string } }).__env?.GRAPHQL_URL ??
          'http://localhost:3000/graphql';

        return {
          link: httpLink.create({ uri: graphqlUrl }),
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
      deps: [HttpLink],
    },
  ]);
}
