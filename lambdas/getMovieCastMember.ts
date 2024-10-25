import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { MovieCastMemberQueryParams } from "../shared/types"; // Ensure this is defined properly
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, QueryCommandInput } from "@aws-sdk/lib-dynamodb";
import Ajv from "ajv";
import schema from "../shared/types.schema.json";

const ajv = new Ajv();
const isValidQueryParams = ajv.compile(schema.definitions["MovieCastMemberQueryParams"] || {});
const ddbDocClient = createDocumentClient();

const STATUS_BAD_REQUEST = 400;
const STATUS_SERVER_ERROR = 500;

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("[EVENT]", JSON.stringify(event));
    
    if (!process.env.TABLE_NAME || !process.env.REGION) {
      return {
        statusCode: STATUS_SERVER_ERROR,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Server configuration error" }),
      };
    }

    const queryParams = event.queryStringParameters;

    if (!queryParams) {
      return {
        statusCode: STATUS_BAD_REQUEST,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Missing query parameters" }),
      };
    }

    // Validate the query parameters against the schema
    if (!isValidQueryParams(queryParams)) {
      return {
        statusCode: STATUS_BAD_REQUEST,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: "Incorrect type. Must match Query parameters schema",
          schema: schema.definitions["MovieCastMemberQueryParams"],
        }),
      };
    }

    const validatedQueryParams = queryParams as unknown as MovieCastMemberQueryParams; // Cast to unknown first

    // Validate and convert movieId to integer
    const movieId = parseInt(validatedQueryParams.movieId, 10);
    if (isNaN(movieId)) {
      return {
        statusCode: STATUS_BAD_REQUEST,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "movieId must be a valid number" }),
      };
    }

    // Prepare the command input for DynamoDB Query
    let commandInput: QueryCommandInput = {
      TableName: process.env.TABLE_NAME,
    };

    // Set conditions based on the provided query parameters
    if ("roleName" in validatedQueryParams) {
      commandInput.IndexName = "roleIx"; // Use role index if roleName is provided
      commandInput.KeyConditionExpression = "movieId = :m and begins_with(roleName, :r)";
      commandInput.ExpressionAttributeValues = {
        ":m": movieId,
        ":r": validatedQueryParams.roleName,
      };
    } else if ("actorName" in validatedQueryParams) {
      commandInput.KeyConditionExpression = "movieId = :m and begins_with(actorName, :a)";
      commandInput.ExpressionAttributeValues = {
        ":m": movieId,
        ":a": validatedQueryParams.actorName,
      };
    } else {
      commandInput.KeyConditionExpression = "movieId = :m"; // Fallback to just movieId
      commandInput.ExpressionAttributeValues = {
        ":m": movieId,
      };
    }

    // Execute the query command
    const commandOutput = await ddbDocClient.send(new QueryCommand(commandInput));

    // Return the query results
    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        data: commandOutput.Items || [], // Return the items fetched from the database, or an empty array if none
      }),
    };
  } catch (error: any) {
    console.error("[ERROR]", JSON.stringify(error));
    return {
      statusCode: STATUS_SERVER_ERROR,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: error.message }),
    };
  }
};

function createDocumentClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = {
    wrapNumbers: false,
  };
  const translateConfig = { marshallOptions, unmarshallOptions };
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
