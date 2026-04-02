import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: '../cloudtalk_homework_be/schema.graphql',
  documents: 'src/**/*.queries.ts',
  generates: {
    'src/generated/graphql.ts': {
      plugins: ['typescript', 'typescript-operations', 'typescript-apollo-angular'],
      config: {
        addExplicitOverride: true,
        apolloAngularVersion: 3,
        gqlImport: 'apollo-angular#gql',
        scalars: {
          DateTime: 'string',
        },
      },
    },
  },
};

export default config;
