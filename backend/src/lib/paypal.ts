/**
 * paypal.ts — Service PayPal REST API v2
 *
 * Flux :
 *   1. getAccessToken()  → token OAuth2 PayPal
 *   2. createOrder()     → crée une commande PayPal, retourne orderId
 *   3. captureOrder()    → capture le paiement approuvé
 *   4. getOrderDetails() → vérifie le statut d'une commande
 */
import fetch from 'node-fetch';

const PAYPAL_MODE   = process.env.PAYPAL_MODE || 'sandbox';
const PAYPAL_API    = PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

const CLIENT_ID     = process.env.PAYPAL_CLIENT_ID!;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET!;

// ── 1. OAuth2 Token ───────────────────────────────────────────────────────────
export async function getAccessToken(): Promise<string> {
  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal auth failed: ${err}`);
  }

  const data = await res.json() as { access_token: string };
  return data.access_token;
}

// ── 2. Créer une commande PayPal ──────────────────────────────────────────────
export async function createOrder(opts: {
  amount: number;
  currency?: string;
  description?: string;
  returnUrl: string;
  cancelUrl: string;
}) {
  const token = await getAccessToken();

  const body = {
    intent: 'CAPTURE',
    purchase_units: [{
      amount: {
        currency_code: opts.currency || 'EUR',
        value: opts.amount.toFixed(2),
      },
      description: opts.description || 'FocusBrain Premium',
    }],
    application_context: {
      brand_name: 'FocusBrain',
      locale: 'fr-FR',
      landing_page: 'BILLING',
      user_action: 'PAY_NOW',
      return_url: opts.returnUrl,
      cancel_url: opts.cancelUrl,
    },
    payment_source: {
      paypal: {
        experience_context: {
          payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
          brand_name: 'FocusBrain',
          locale: 'fr-FR',
          landing_page: 'LOGIN',
          user_action: 'PAY_NOW',
        },
      },
    },
  };

  const res = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `focusbrain-${Date.now()}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`createOrder failed: ${err}`);
  }

  return res.json() as Promise<{ id: string; status: string; links: any[] }>;
}

// ── 3. Capturer un paiement approuvé ─────────────────────────────────────────
export async function captureOrder(orderId: string) {
  const token = await getAccessToken();

  const res = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`captureOrder failed: ${err}`);
  }

  return res.json() as Promise<{
    id: string;
    status: string;
    purchase_units: Array<{
      payments: {
        captures: Array<{
          id: string;
          amount: { value: string; currency_code: string };
          status: string;
        }>;
      };
    }>;
    payer: { email_address?: string; payer_id: string };
  }>;
}

// ── 4. Détails d'une commande ─────────────────────────────────────────────────
export async function getOrderDetails(orderId: string) {
  const token = await getAccessToken();

  const res = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(`getOrderDetails failed: ${await res.text()}`);
  return res.json();
}
