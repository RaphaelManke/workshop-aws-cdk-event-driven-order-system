import { EventBridge } from "@aws-sdk/client-eventbridge";
import { DynamoDBStreamEvent } from "aws-lambda";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { AttributeValue } from "@aws-sdk/client-dynamodb";
const eventbridgeClient = new EventBridge({});

export const handler = async (event: DynamoDBStreamEvent): Promise<void> => {
  for (const record of event.Records) {
    if (record.eventName === "INSERT" && record.dynamodb?.NewImage) {
      /* 
      cast to AttributeValue because @types/aws-lambda 
      {
         [key: string]: AttributeValue;
      } is not compatible with type from @aws-sdk/util-dynamodb
      Record<string, AttributeValue>
      */
      const item = record.dynamodb.NewImage as Record<string, AttributeValue>;
      const databaseItem = unmarshall(item);
      const detailType = databaseItem.delivered ? "delivery" : "order";
      await eventbridgeClient.putEvents({
        Entries: [
          {
            EventBusName: process.env.EVENTBUS,
            Source: "order-delivery-service",
            DetailType: detailType,
            Detail: JSON.stringify({
              databaseItem,
              link: process.env.APIURL + "/" + databaseItem.id,
            }),
          },
        ],
      });
    }
  }
};
