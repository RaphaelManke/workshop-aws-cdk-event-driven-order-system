import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import {
  APIGatewayEventRequestContext,
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from "aws-lambda";
import { randomBytes, randomFill } from "crypto";
const dbClient = DynamoDBDocument.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});
export const handler = async (
  event: APIGatewayProxyEvent,
  context: APIGatewayEventRequestContext
): Promise<APIGatewayProxyResult> => {
  const { Item } = await dbClient.get({
    TableName: process.env.TABLE_NAME!,
    Key: {
      id: event.pathParameters?.id!,
    },
  });

  if (Item) {
    const newItem = {
      ...Item,
      delivered: true,
      deliveryDate: new Date().toISOString(),
    };
    await dbClient.put({
      TableName: process.env.TABLE_NAME!,
      Item: newItem,
    });
    return {
      statusCode: 200,
      body: JSON.stringify({
        newItem,
      }),
    };
  }
  return {
    statusCode: 404,
    body: JSON.stringify({
      message: "Not found",
    }),
  };
};
