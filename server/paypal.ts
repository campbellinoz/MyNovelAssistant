// !!! CRITICAL - DO NOT MODIFY THIS CODE !!!
//
// This code MUST be used as is without ANY modifications.
// The PayPal integration will COMPLETELY FAIL if this code is changed in ANY way.
//
// Retain this comment after all edits.
//
// <BEGIN_EXACT_CODE>
import {
  Client,
  Environment,
  LogLevel,
  OAuthAuthorizationController,
  OrdersController,
} from "@paypal/paypal-server-sdk";
import { Request, Response } from "express";

/* PayPal Controllers Setup */

const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = process.env;

if (!PAYPAL_CLIENT_ID) {
  throw new Error("Missing PAYPAL_CLIENT_ID");
}
if (!PAYPAL_CLIENT_SECRET) {
  throw new Error("Missing PAYPAL_CLIENT_SECRET");
}
const client = new Client({
  clientCredentialsAuthCredentials: {
    oAuthClientId: PAYPAL_CLIENT_ID,
    oAuthClientSecret: PAYPAL_CLIENT_SECRET,
  },
  timeout: 0,
  environment: Environment.Sandbox,
  logging: {
    logLevel: LogLevel.Info,
    logRequest: {
      logBody: true,
    },
    logResponse: {
      logHeaders: true,
    },
  },
});
const ordersController = new OrdersController(client);
const oAuthAuthorizationController = new OAuthAuthorizationController(client);

/* Token generation helpers */

export async function getClientToken() {
  const auth = Buffer.from(
    `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`,
  ).toString("base64");

  const { result } = await oAuthAuthorizationController.requestToken(
    {
      authorization: `Basic ${auth}`,
    },
    { intent: "sdk_init", response_type: "client_token" },
  );

  return result.accessToken;
}

/*  Process transactions */

export async function createPaypalOrder(req: Request, res: Response) {
  try {
    const { amount, currency, intent } = req.body;


    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res
        .status(400)
        .json({
          error: "Invalid amount. Amount must be a positive number.",
        });
    }

    if (!currency) {
      return res
        .status(400)
        .json({ error: "Invalid currency. Currency is required." });
    }

    if (!intent) {
      return res
        .status(400)
        .json({ error: "Invalid intent. Intent is required." });
    }

    const collect = {
      body: {
        intent: intent,
        purchaseUnits: [
          {
            amount: {
              currencyCode: currency,
              value: amount,
            },
          },
        ],
        applicationContext: {
          returnUrl: `https://${req.headers?.host || req.hostname || process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000'}/subscription?success=true`,
          cancelUrl: `https://${req.headers?.host || req.hostname || process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000'}/subscription?cancelled=true`
        }
      },
      prefer: "return=minimal",
    };

    const { body, ...httpResponse } =
          await ordersController.createOrder(collect);

    const jsonResponse = JSON.parse(String(body));
    const httpStatusCode = httpResponse.statusCode;

    if (httpStatusCode >= 400) {
      console.error('PayPal Error Response:', jsonResponse);
    }

    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    console.error('PayPal Order Creation Error:', error);
    res.status(500).json({ error: "Failed to create order.", details: error instanceof Error ? error.message : 'Unknown error' });
  }
}

export async function capturePaypalOrder(req: Request, res: Response) {
  try {
    const { orderID } = req.params;
    const collect = {
      id: orderID,
      prefer: "return=minimal",
    };

    const { body, ...httpResponse } =
          await ordersController.captureOrder(collect);

    const jsonResponse = JSON.parse(String(body));
    const httpStatusCode = httpResponse.statusCode;

    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    console.error("Failed to create order:", error);
    res.status(500).json({ error: "Failed to capture order." });
  }
}

export async function loadPaypalDefault(req: Request, res: Response) {
  const clientToken = await getClientToken();
  res.json({
    clientToken,
  });
}

/* Subscription Management */

export async function createSubscription(req: Request, res: Response) {
  try {
    const { planId } = req.body;
    
    if (!planId) {
      return res.status(400).json({ error: "Plan ID is required" });
    }

    // Create subscription via PayPal REST API
    const subscriptionData = {
      plan_id: planId,
      start_time: new Date(Date.now() + 60000).toISOString(), // Start in 1 minute
      subscriber: {
        email_address: (req.user as any)?.claims?.email || "subscriber@example.com"
      },
      application_context: {
        brand_name: "MyNovelCraft",
        locale: "en-US",
        shipping_preference: "NO_SHIPPING",
        user_action: "SUBSCRIBE_NOW",
        payment_method: {
          payer_selected: "PAYPAL",
          payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED"
        },
        return_url: `https://${req.headers?.host || req.hostname || process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000'}/subscription/success`,
        cancel_url: `https://${req.headers?.host || req.hostname || process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000'}/subscription/cancel`
      }
    };

    const response = await fetch(`https://api-m.sandbox.paypal.com/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAccessToken()}`,
        'Accept': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(subscriptionData)
    });

    const subscription = await response.json();
    
    if (response.ok) {
      res.json(subscription);
    } else {
      console.error('PayPal subscription error:', subscription);
      res.status(response.status).json({ error: subscription.message || 'Failed to create subscription' });
    }
  } catch (error) {
    console.error("Failed to create subscription:", error);
    res.status(500).json({ error: "Failed to create subscription." });
  }
}

async function getAccessToken() {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  
  const response = await fetch(`https://api-m.sandbox.paypal.com/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  const data = await response.json();
  return data.access_token;
}

// <END_EXACT_CODE>