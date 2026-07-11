import { prisma } from '../lib/prisma';
import { BadgeType } from '@prisma/client';

// Sessions réellement terminées dans le flux Slot (le vrai produit) —
// l'ancienne table `participant` n'est plus alimentée
const completedSlots = (userId: string) =>
  prisma.slot.count({
    where: { OR: [{ creatorId: userId }, { partnerId: userId }], completedAt: { not: null } },
  });

const BADGE_RULES: { type: BadgeType; check: (userId: string) => Promise<boolean> }[] = [
  {
    type: BadgeType.PREMIER_PAS,
    check: async (userId) => (await completedSlots(userId)) >= 1,
  },
  {
    type: BadgeType.REGULIER,
    check: async (userId) => (await completedSlots(userId)) >= 10,
  },
  {
    type: BadgeType.BODY_DOUBLER,
    check: async (userId) => (await completedSlots(userId)) >= 50,
  },
  {
    type: BadgeType.CERCLE_FIDELE,
    check: async (userId) => {
      const circle = await prisma.circleMember.findFirst({
        where: { userId, sessionCount: { gte: 5 } },
      });
      return !!circle;
    },
  },
  {
    type: BadgeType.EARLY_ACTIVATOR,
    check: async (userId) => {
      const slots = await prisma.slot.findMany({
        where: { OR: [{ creatorId: userId }, { partnerId: userId }], completedAt: { not: null } },
        select: { startTime: true },
      });
      const earlyCount = slots.filter(s => s.startTime.getHours() < 9).length;
      return earlyCount >= 10;
    },
  },
  {
    type: BadgeType.REBOUND_CHAMPION,
    check: async (userId) => {
      // Revenu après une pause de +14 jours — le badge anti-culpabilisation
      const slots = await prisma.slot.findMany({
        where: { OR: [{ creatorId: userId }, { partnerId: userId }], completedAt: { not: null } },
        orderBy: { startTime: 'asc' },
        select: { startTime: true },
      });
      for (let i = 1; i < slots.length; i++) {
        const gap = slots[i].startTime.getTime() - slots[i - 1].startTime.getTime();
        if (gap > 14 * 24 * 60 * 60 * 1000) return true;
      }
      return false;
    },
  },
  {
    type: BadgeType.BRAIN_BREAK_MASTER,
    check: async (userId) => {
      const count = await prisma.participant.count({
        where: { userId, brainBreakUsed: true },
      });
      return count >= 50;
    },
  },
];

export async function checkAndAwardBadges(userId: string): Promise<BadgeType[]> {
  const existing = await prisma.badge.findMany({ where: { userId }, select: { type: true } });
  const existingTypes = new Set(existing.map(b => b.type));

  const awarded: BadgeType[] = [];

  for (const rule of BADGE_RULES) {
    if (existingTypes.has(rule.type)) continue;
    const earned = await rule.check(userId);
    if (earned) {
      await prisma.badge.create({ data: { userId, type: rule.type } });
      awarded.push(rule.type);
    }
  }

  return awarded;
}
