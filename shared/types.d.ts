// shared/types.ts or shared/types.d.ts

// Define MovieCast interface
export interface MovieCast {
  movieId: number;  // Change this from string to number
  actorName: string;
  roleName: string;
  roleDescription: string;
}

// Other type definitions
export type Movie = {
  id: number;
  backdrop_path: string;
  genre_ids: number[];
  original_language: string;
  original_title: string;
  adult: boolean;
  overview: string;
  popularity: number;
  poster_path: string;
  release_date: string;
  title: string;
  video: boolean;
  vote_average: number;
  vote_count: number;
};

// You can also export MovieCastMemberQueryParams if it exists
export interface MovieCastMemberQueryParams {
  movieId: string;
  roleName?: string;
  actorName?: string;
  
}
