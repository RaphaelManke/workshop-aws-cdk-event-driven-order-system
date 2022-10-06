import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import {
  AttributeType,
  BillingMode,
  StreamViewType,
  Table,
} from "aws-cdk-lib/aws-dynamodb";
import { EventBus, Rule } from "aws-cdk-lib/aws-events";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Topic } from "aws-cdk-lib/aws-sns";
import { CloudWatchLogGroup, SnsTopic } from "aws-cdk-lib/aws-events-targets";
import { Construct } from "constructs";
import { EmailSubscription } from "aws-cdk-lib/aws-sns-subscriptions";
import { Runtime, StartingPosition } from "aws-cdk-lib/aws-lambda";
import { DynamoEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { Stack, StackProps } from "aws-cdk-lib";
import { LogGroup } from "aws-cdk-lib/aws-logs";

/**
 * Props the stack takes as input
 */
interface OrderDeliveryStackProps extends StackProps {
  orderEmail: string;
}

export class OrderDeliveryStack extends Stack {
  constructor(scope: Construct, id: string, props: OrderDeliveryStackProps) {
    super(scope, id, props);
    /**
     * AWS Apigateway
     */
    const api = new RestApi(this, "api");

    /**
     * AWS DynamoDB for storing orders
     */
    const orderTable = new Table(this, "order-table", {
      partitionKey: { name: "id", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      stream: StreamViewType.NEW_IMAGE,
    });

    /**
     * Lambda that stores the order in the database
     */
    const lambda = new NodejsFunction(this, "lambda-order", {
      entry: "lib/lambdas/lambda-order.ts",
      environment: {
        TABLE_NAME: orderTable.tableName,
      },
    });
    // grant the lambda role read/write permissions to our table to be able to store the order
    orderTable.grantReadWriteData(lambda);

    // Add the lambda as handler order endpoint
    api.root
      .addResource("order")
      .addMethod("GET", new LambdaIntegration(lambda));

    /**
     * Eventbus for all the events created in this service
     */
    const eventBus = new EventBus(this, "eventbus");
    const eventLoggroup = new LogGroup(this, "event-loggroup");

    // log all events on the eventbus to cloudwatch
    new Rule(this, "log-all-events-rule", {
      eventBus: eventBus,
      eventPattern: {
        source: ["order-delivery-service"],
      },
      targets: [new CloudWatchLogGroup(eventLoggroup)],
    });

    /**
     * Stream the order table to a lambda that publish events to the eventbus
     */
    const lambdaStream = new NodejsFunction(this, "lambda-stream", {
      entry: "lib/lambdas/lambda-stream.ts",
      runtime: Runtime.NODEJS_16_X,
      environment: {
        EVENTBUS: eventBus.eventBusName,
        APIURL: api.url + "delivery",
      },
    });

    lambdaStream.addEventSource(
      new DynamoEventSource(orderTable, {
        // start reading the dynamodb stream from the beginning
        startingPosition: StartingPosition.TRIM_HORIZON,
      })
    );
    eventBus.grantPutEventsTo(lambdaStream);

    /**
     * Send an email when an order is placed
     */
    const topic = new Topic(this, "order-topic");
    topic.addSubscription(new EmailSubscription(props.orderEmail));

    new Rule(this, "rule-send-order-mail", {
      eventBus,
      eventPattern: {
        detailType: ["order"],
        source: ["order-delivery-service"],
      },
      targets: [new SnsTopic(topic)],
    });

    /**
     * Mark an order as delivered
     */
    const lambdaDelivery = new NodejsFunction(this, "lambda-delivery", {
      entry: "lib/lambdas/lambda-delivery.ts",
      runtime: Runtime.NODEJS_16_X,
      environment: {
        TABLE_NAME: orderTable.tableName,
      },
    });

    orderTable.grantReadWriteData(lambdaDelivery);
    api.root
      .addResource("delivery")
      .addResource("{id}")
      .addMethod("GET", new LambdaIntegration(lambdaDelivery));
  }
}
