/**
 * payments.ts — Routes paiement PayPal
 *
 * POST /api/payments/create-order   → crée la commande, retourne orderId + clientId
 * POST /api/payments/capture/:id    → capture + active isPremium
 * GET  /api/payments/history        → historique des paiements de l'utilisateur
 * GET  /api/payments/status         → statut abonnement courant
 */
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { createOrder, captureOrder } from '../lib/paypal';

const router = Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5174';

// ── Plans disponibles ────────────────────────────────────────────────────────
const PLANS = {
  PREMIUM_MONTHLY: { amount: 9.99,  label: 'FocusBrain Premium — 1 mois',  duration: 30  },
  PREMIUM_YEARLY:  { amount: 79.99, label: 'FocusBrain Premium — 1 an',    duration: 365 },
  DONATION:        { amount: null,   label: 'Don FocusBrain TDAH',          duration: 0   },
};

// ── POST /api/payments/create-order ─────────────────────────────────────────
router.post('/create-order', async (req: any, res) => {
  const schema = z.object({
    plan:   z.enum(['PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'DONATION']),
    amount: z.number().min(1).max(9999).optional(), // pour les dons
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Données invalides' });

  const { plan, amount: customAmount } = parsed.data;
  const planInfo = PLANS[plan];
  const finalAmount = plan === 'DONATION' ? (customAmount ?? 10) : planInfo.amount!;

  try {
    const order = await createOrder({
      amount: finalAmount,
      currency: 'EUR',
      description: planInfo.label,
      returnUrl:  `${FRONTEND_URL}/payment/success`,
      cancelUrl:  `${FRONTEND_URL}/payment/cancel`,
    });

    // Pré-enregistrer le paiement en PENDING
    await prisma.payment.create({
      data: {
        userId:   req.userId,
        orderId:  order.id,
        amount:   finalAmount,
        currency: 'EUR',
        plan,
        status:   'PENDING',
      },
    });

    res.json({
      orderId:  order.id,
      clientId: process.env.PAYPAL_CLIENT_ID,
      amount:   finalAmount,
      currency: 'EUR',
      mode:     process.env.PAYPAL_MODE || 'sandbox',
    });
  } catch (err: any) {
    console.error('❌ createOrder error:', err.message);
    res.status(500).json({ error: 'Impossible de créer la commande PayPal' });
  }
});

// ── POST /api/payments/capture/:orderId ─────────────────────────────────────
router.post('/capture/:orderId', async (req: any, res) => {
  const { orderId } = req.params;

  // Vérifier que la commande appartient à l'utilisateur
  const payment = await prisma.payment.findUnique({ where: { orderId } });
  if (!payment || payment.userId !== req.userId) {
    return res.status(403).json({ error: 'Commande introuvable' });
  }
  if (payment.status === 'COMPLETED') {
    return res.json({ status: 'COMPLETED', already: true });
  }

  try {
    const capture = await captureOrder(orderId);

    if (capture.status !== 'COMPLETED') {
      return res.status(400).json({ error: `Paiement non complété: ${capture.status}` });
    }

    const captureData = capture.purchase_units[0]?.payments?.captures?.[0];
    const method = req.body.paymentMethod || 'paypal';

    // Mettre à jour le paiement en base
    await prisma.payment.update({
      where: { orderId },
      data: {
        status:      'COMPLETED',
        method,
        paypalEmail: capture.payer?.email_address,
        completedAt: new Date(),
      },
    });

    // Activer isPremium si c'est un abonnement
    if (payment.plan !== 'DONATION') {
      const durationDays = payment.plan === 'PREMIUM_YEARLY' ? 365 : 30;
      const premiumUntil = new Date();
      premiumUntil.setDate(premiumUntil.getDate() + durationDays);

      await prisma.user.update({
        where: { id: req.userId },
        data: { isPremium: true },
      });
    }

    res.json({
      status:  'COMPLETED',
      amount:  captureData?.amount?.value,
      currency: captureData?.amount?.currency_code,
      plan:    payment.plan,
    });
  } catch (err: any) {
    console.error('❌ captureOrder error:', err.message);

    await prisma.payment.update({
      where: { orderId },
      data: { status: 'FAILED' },
    }).catch(() => {});

    res.status(500).json({ error: 'Échec de la capture du paiement' });
  }
});

// ── GET /api/payments/history ────────────────────────────────────────────────
router.get('/history', async (req: any, res) => {
  const payments = await prisma.payment.findMany({
    where:   { userId: req.userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true, orderId: true, amount: true, currency: true,
      status: true, plan: true, method: true, createdAt: true, completedAt: true,
    },
  });
  res.json(payments);
});

// ── GET /api/payments/status ─────────────────────────────────────────────────
router.get('/status', async (req: any, res) => {
  const user = await prisma.user.findUnique({
    where:  { id: req.userId },
    select: { isPremium: true },
  });

  const lastPayment = await prisma.payment.findFirst({
    where:   { userId: req.userId, status: 'COMPLETED', plan: { not: 'DONATION' } },
    orderBy: { completedAt: 'desc' },
  });

  res.json({
    isPremium:  user?.isPremium ?? false,
    lastPayment: lastPayment ? {
      amount: lastPayment.amount,
      plan:   lastPayment.plan,
      date:   lastPayment.completedAt,
    } : null,
  });
});

export default router;
