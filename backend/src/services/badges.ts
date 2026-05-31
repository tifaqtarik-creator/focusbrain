import { prisma } from '../lib/prisma';
import { BadgeType } from '@prisma/client';

const BADGE_RULES: { type: BadgeType; check: (userId: string) => Promise<boolean> }[] = [
  {
    type: BadgeType.PREMIER_PAS,
    check: async (userId) => {
      const count = await prisma.participant.count({ where: { userId } });
      return count >= 1;
    },
  },
  {
    type: BadgeType.REGULIER,
    check: async (userId) => {
      const count = await prisma.participant.count({ where: { userId } });
      return count >= 10;
    },
  },
  {
    type: BadgeType.BODY_DOUBLER,
    check: async (userId) => {
      const count = await prisma.participant.count({ where: { userId } });
      return count >= 50;
    },
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
      const earlySessions = await prisma.participant.findMany({
        where: { userId },
        include: { session: { select: { startTime: true } } },
      });
      const earlyCount = earlySessions.filter(p => {
        const hour = p.session.startTime?.getHours();
        return hour !== undefined && hour < 9;
      }).length;
      return earlyCount >= 10;
    },
  },
  {
    type: BadgeType.REBOUND_CHAMPION,
    check: async (userId) => {
      const sessions = await prisma.participant.findMany({
        where: { userId },
        orderBy: { joinedAt: 'asc' },
        select: { joinedAt: true },
      });
      for (let i = 1; i < sessions.length; i++) {
        const gap = sessions[i].joinedAt.getTime() - sessions[i - 1].joinedAt.getTime();
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
