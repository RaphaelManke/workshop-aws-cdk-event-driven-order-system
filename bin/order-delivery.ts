#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { OrderDeliveryStack } from "../lib/order-delivery-stack";

/**
 * Replace this email with your email
 */
const orderEmail = process.env.ORDER_EMAIL || "";
const app = new cdk.App();
new OrderDeliveryStack(app, "OrderDeliveryStack", {
  orderEmail,
});
