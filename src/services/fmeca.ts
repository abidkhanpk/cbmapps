import prisma from '@/config/database';
import { FmecaCalculation } from '@/types';

export class FmecaService {
  static calculateRPN(severity: number, occurrence: number, detectability: number): number {
    return severity * occurrence * detectability;
  }

  static async determineCriticality(rpn: number): Promise<'low' | 'medium' | 'high'> {
    const rule = await prisma.criticalityRule.findFirst({
      where: { name: 'default' },
    });

    if (!rule) {
      // Default fallback
      if (rpn <= 99) return 'low';
      if (rpn <= 199) return 'medium';
      return 'high';
    }

    const thresholds = rule.rpnThresholds as any;
    if (rpn >= thresholds.low[0] && rpn <= thresholds.low[1]) return 'low';
    if (rpn >= thresholds.medium[0] && rpn <= thresholds.medium[1]) return 'medium';
    return 'high';
  }

  static async calculateFmecaItem(
    severity: number,
    occurrence: number,
    detectability: number
  ): Promise<FmecaCalculation> {
    const rpn = this.calculateRPN(severity, occurrence, detectability);
    const criticality = await this.determineCriticality(rpn);

    return {
      severity,
      occurrence,
      detectability,
      rpn,
      criticality,
    };
  }

  static async updateFmecaItemCalculations(itemId: string) {
    const item = await prisma.fmecaItem.findUnique({
      where: { id: itemId },
    });

    if (!item) throw new Error('FMECA item not found');

    const calculation = await this.calculateFmecaItem(
      item.severity,
      item.occurrence,
      item.detectability
    );

    await prisma.fmecaItem.update({
      where: { id: itemId },
      data: {
        rpn: calculation.rpn,
        criticality: calculation.criticality,
      },
    });
  }
}
