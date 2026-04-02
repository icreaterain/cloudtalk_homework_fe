import { gql } from 'apollo-angular';

export const MY_REVIEWS_QUERY = gql`
  query MyReviews($first: Int, $after: String) {
    myReviews(first: $first, after: $after) {
      edges {
        cursor
        node {
          id
          rating
          title
          body
          createdAt
          updatedAt
          helpfulCount
          viewerHasVotedHelpful
          author {
            id
            displayName
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`;
