#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import "source-map-support/register";
import { OrderDeliveryStack } from "../lib/order-delivery-stack";

/**
 * Replace this email with your email
 */
const orderEmail = process.env.ORDER_EMAIL || "";
const app = new App();
new OrderDeliveryStack(app, "OrderDeliveryStack", {
  orderEmail,
});
