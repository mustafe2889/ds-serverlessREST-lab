import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { movieCasts } from "../seed/movies";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("[EVENT]", JSON.stringify(event));

    const movieId = event.pathParameters?.movieId ? parseInt(event.pathParameters.movieId) : undefined;
    if (!movieId) {
      return {
        statusCode: 400, // Changed to 400 for invalid input
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Missing or invalid movie ID" }),
      };
    }

    const castIncluded = event.queryStringParameters?.cast === 'true';

    if (!process.env.TABLE_NAME) {
      throw new Error("DynamoDB table name not set in environment variables.");
    }

    const commandOutput = await ddbDocClient.send(
      new GetCommand({
        TableName: process.env.TABLE_NAME,
        Key: { id: movieId },
      })
    );

    if (!commandOutput.Item) {
      return {
        statusCode: 404,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Movie not found" }), // Updated message for clarity
      };
    }

    const responseBody: { data: any } = { data: commandOutput.Item };

    if (castIncluded) {
      const cast = getMovieCastMember(movieId);
      responseBody.data.cast = cast; // Assuming cast is correctly structured
    }

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(responseBody),
    };
  } catch (error: any) {
    console.error("Error occurred:", error);
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: error.message || "Internal Server Error" }),
    };
  }
};

// Helper functions
function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = { convertEmptyValues: true, removeUndefinedValues: true, convertClassInstanceToMap: true };
  const unmarshallOptions = { wrapNumbers: false };
  return DynamoDBDocumentClient.from(ddbClient, { marshallOptions, unmarshallOptions });
}

function getMovieCastMember(movieId: number) {
  return movieCasts.filter(cast => cast.movieId === movieId);
}
