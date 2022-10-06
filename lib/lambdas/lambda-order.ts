import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import {
  APIGatewayEventRequestContext,
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from "aws-lambda";
import { randomInt, randomUUID } from "crypto";
const dbClient = DynamoDBDocument.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

const PRODUCTS = ["cappucico", "latte", "espresso", "mocha"];
export const handler = async (
  event: APIGatewayProxyEvent,
  context: APIGatewayEventRequestContext
): Promise<APIGatewayProxyResult> => {
  const product = PRODUCTS[randomInt(PRODUCTS.length - 1)];
  const productOrder = {
    id: randomUUID(),
    orderDate: new Date().toISOString(),
    product,
  };
  await dbClient.put({
    TableName: process.env.TABLE_NAME!,
    Item: productOrder,
  });
  return {
    statusCode: 200,
    body: JSON.stringify(productOrder),
  };
};
