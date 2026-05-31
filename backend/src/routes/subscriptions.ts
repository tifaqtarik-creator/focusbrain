import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/subscriptions/status
router.get('/status', async (req: AuthRequest, res) => {
  try {
    const sub = await prisma.subscription.findUnique({ where: { userId: req.userId! } });
    res.json({ isPremium: !!sub && sub.status === 'active', subscription: sub });
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/subscriptions/webhook — Stripe webhook
router.post('/webhook', async (req, res) => {
  // Stripe webhook handler — valider signature en production
  const event = req.body;

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const user = await prisma.user.findFirst({ where: { stripeId: sub.customer } });
        if (user) {
          await prisma.subscription.upsert({
            where: { userId: user.id },
            update: { status: sub.status, currentPeriodEnd: new Date(sub.current_period_end * 1000) },
            create: {
              userId: user.id, stripeSubId: sub.id, plan: 'premium',
              status: sub.status, currentPeriodEnd: new Date(sub.current_period_end * 1000),
            },
          });
          await prisma.user.update({
            where: { id: user.id },
            data: { isPremium: sub.status === 'active' },
          });
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const user = await prisma.user.findFirst({ where: { stripeId: sub.customer } });
        if (user) {
          await prisma.user.update({ where: { id: user.id }, data: { isPremium: false } });
        }
        break;
      }
    }
    res.json({ received: true });
  } catch {
    res.status(500).json({ error: 'Erreur webhook' });
  }
});

export default router;
