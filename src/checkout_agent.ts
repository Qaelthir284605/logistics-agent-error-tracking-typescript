import { captureCheckoutFailure } from "./infrai_errors.ts";

type Shipment = { orderId: string; postalCode: string };

async function chooseCarrier(shipment: Shipment): Promise<string> {
  if (!shipment.postalCode) throw new Error("postal code is required");
  return "standard-carrier";
}

export async function prepareShipment(shipment: Shipment): Promise<string> {
  try {
    return await chooseCarrier(shipment);
  } catch (error) {
    await captureCheckoutFailure(error, shipment.orderId, "choose-carrier");
    throw error;
  }
}

const shipment = { orderId: process.env.ORDER_ID ?? "order-demo-1042", postalCode: "200000" };
prepareShipment(shipment)
  .then((carrier) => console.log(`shipment ${shipment.orderId} prepared with ${carrier}`))
  .catch(() => process.exitCode = 1);
