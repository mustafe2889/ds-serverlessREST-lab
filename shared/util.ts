import { marshall } from "@aws-sdk/util-dynamodb";
import { Movie, MovieCast } from "./types";

// Function to generate a Movie item for DynamoDB
export const generateMovieItem = (movie: Movie) => {
  return {
    PutRequest: {
      Item: marshall(movie),
    },
  };
};

// Function to generate a MovieCast item for DynamoDB
export const generateMovieCastItem = (movieCast: MovieCast) => {
  return {
    PutRequest: {
      Item: marshall(movieCast),
    },
  };
};

// Generic function to generate a batch of items for DynamoDB
export const generateBatch = <T>(data: T[], generateItemFn: (item: T) => any) => {
  return data.map((item) => generateItemFn(item));
};

// Usage example:
// const movieBatch = generateBatch(movies, generateMovieItem);
// const movieCastBatch = generateBatch(movieCasts, generateMovieCastItem);
