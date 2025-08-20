import { prisma } from '@/lib/db';
import { Criticality } from '@prisma/client';

export interface FmecaCalculationResult {
  rpn: number;
  criticality: Criticality;
}

export class FmecaService {
  static calculateRPN(severity: number, occurrence: number, detectability: number): number {
    return severity * occurrence * detectability;
  }

  static async determineCriticality(rpn: number): Promise<Criticality> {
    // Get the active criticality rule (for now, use a default one)
    const rule = await prisma.criticalityRule.findFirst({
      where: { name: 'Default' },
    });

    if (!rule) {
      // Default thresholds if no rule is found
      if (rpn >= 200) return 'high';
      if (rpn >= 100) return 'medium';
      return 'low';
    }

    const thresholds = rule.rpn_thresholds as {
      low: { min: number; max: number };
      medium: { min: number; max: number };
      high: { min: number; max: number };
    };

    if (rpn >= thresholds.high.min && rpn <= thresholds.high.max) return 'high';
    if (rpn >= thresholds.medium.min && rpn <= thresholds.medium.max) return 'medium';
    return 'low';
  }

  static async calculateFmecaItem(
    severity: number,
    occurrence: number,
    detectability: number
  ): Promise<FmecaCalculationResult> {
    const rpn = this.calculateRPN(severity, occurrence, detectability);
    const criticality = await this.determineCriticality(rpn);

    return { rpn, criticality };
  }

  static async updateFmecaItemCalculations(itemId: string): Promise<void> {
    const item = await prisma.fmecaItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new Error('FMECA item not found');
    }

    const { rpn, criticality } = await this.calculateFmecaItem(
      item.severity,
      item.occurrence,
      item.detectability
    );

    await prisma.fmecaItem.update({
      where: { id: itemId },
      data: { rpn, criticality },
    });
  }

  static async getStudyStatistics(studyId: string) {
    const items = await prisma.fmecaItem.findMany({
      where: { study_id: studyId },
    });

    const totalItems = items.length;
    const criticalityBreakdown = {
      high: items.filter(item => item.criticality === 'high').length,
      medium: items.filter(item => item.criticality === 'medium').length,
      low: items.filter(item => item.criticality === 'low').length,
    };

    const averageRPN = totalItems > 0 
      ? items.reduce((sum, item) => sum + item.rpn, 0) / totalItems 
      : 0;

    const maxRPN = totalItems > 0 
      ? Math.max(...items.map(item => item.rpn)) 
      : 0;

    return {
      totalItems,
      criticalityBreakdown,
      averageRPN: Math.round(averageRPN * 100) / 100,
      maxRPN,
    };
  }

  static async getRecommendedCMTechniques(failureModeId: string): Promise<string[]> {
    const failureMode = await prisma.failureMode.findUnique({
      where: { id: failureModeId },
    });

    if (!failureMode?.detection_methods) {
      return [];
    }

    // Parse detection methods and return as array
    return failureMode.detection_methods
      .split(',')
      .map(method => method.trim())
      .filter(method => method.length > 0);
  }

  static async submitStudyForApproval(studyId: string, userId: string): Promise<void> {
    // Update study status
    await prisma.fmecaStudy.update({
      where: { id: studyId },
      data: { status: 'in_review' },
    });

    // Find users who can approve studies
    const approvers = await prisma.user.findMany({
      where: {
        is_active: true,
        user_roles: {
          some: {
            role: {
              name: {
                in: ['admin', 'manager', 'reliability_engineer'],
              },
            },
          },
        },
      },
    });

    // Create approval records
    const approvalData = approvers.map(approver => ({
      study_id: studyId,
      approver_user_id: approver.id,
      status: 'pending' as const,
    }));

    await prisma.fmecaApproval.createMany({
      data: approvalData,
    });
  }

  static async approveStudy(studyId: string, approverId: string, comment?: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Update the approval record
      await tx.fmecaApproval.updateMany({
        where: {
          study_id: studyId,
          approver_user_id: approverId,
        },
        data: {
          status: 'approved',
          comment,
          decided_at: new Date(),
        },
      });

      // Check if all approvals are complete
      const pendingApprovals = await tx.fmecaApproval.count({
        where: {
          study_id: studyId,
          status: 'pending',
        },
      });

      // If no pending approvals, mark study as approved
      if (pendingApprovals === 0) {
        await tx.fmecaStudy.update({
          where: { id: studyId },
          data: { status: 'approved' },
        });
      }
    });
  }

  static async rejectStudy(studyId: string, approverId: string, comment?: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Update the approval record
      await tx.fmecaApproval.updateMany({
        where: {
          study_id: studyId,
          approver_user_id: approverId,
        },
        data: {
          status: 'rejected',
          comment,
          decided_at: new Date(),
        },
      });

      // Mark study as draft (needs revision)
      await tx.fmecaStudy.update({
        where: { id: studyId },
        data: { status: 'draft' },
      });
    });
  }
}