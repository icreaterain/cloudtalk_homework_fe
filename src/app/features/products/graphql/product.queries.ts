import { gql } from 'apollo-angular';

export const PRODUCT_LIST_QUERY = gql`
  query ProductList($first: Int, $after: String, $filter: ProductFilterInput) {
    products(first: $first, after: $after, filter: $filter) {
      edges {
        cursor
        node {
          id
          name
          description
          imageUrl
          category
          price
          avgRating
          reviewCount
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

export const PRODUCT_DETAIL_QUERY = gql`
  query ProductDetail($id: String!) {
    product(id: $id) {
      id
      name
      description
      imageUrl
      category
      price
      avgRating
      reviewCount
      ratingDistribution {
        oneStar
        twoStar
        threeStar
        fourStar
        fiveStar
      }
    }
  }
`;

export const PRODUCT_REVIEWS_QUERY = gql`
  query ProductReviews(
    $id: String!
    $first: Int
    $after: String
    $sort: ReviewSort
    $filterByRating: Int
  ) {
    product(id: $id) {
      id
      reviews(first: $first, after: $after, sort: $sort, filterByRating: $filterByRating) {
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
  }
`;
