import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create roles
  console.log('Creating roles...');
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { name: 'admin' },
      update: {},
      create: { name: 'admin' },
    }),
    prisma.role.upsert({
      where: { name: 'reliability_engineer' },
      update: {},
      create: { name: 'reliability_engineer' },
    }),
    prisma.role.upsert({
      where: { name: 'maint_planner' },
      update: {},
      create: { name: 'maint_planner' },
    }),
    prisma.role.upsert({
      where: { name: 'technician' },
      update: {},
      create: { name: 'technician' },
    }),
    prisma.role.upsert({
      where: { name: 'manager' },
      update: {},
      create: { name: 'manager' },
    }),
    prisma.role.upsert({
      where: { name: 'viewer' },
      update: {},
      create: { name: 'viewer' },
    }),
  ]);

  // Create admin user
  console.log('Creating admin user...');
  const adminRole = roles.find(r => r.name === 'admin')!;
  const passwordHash = await bcrypt.hash('Admin@12345', 10);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash,
      fullName: 'System Administrator',
      userRoles: {
        create: {
          roleId: adminRole.id,
        },
      },
    },
  });

  // Create additional users
  console.log('Creating additional users...');
  const engineerRole = roles.find(r => r.name === 'reliability_engineer')!;
  const technicianRole = roles.find(r => r.name === 'technician')!;
  
  const engineerUser = await prisma.user.upsert({
    where: { email: 'engineer@example.com' },
    update: {},
    create: {
      email: 'engineer@example.com',
      passwordHash: await bcrypt.hash('Engineer@123', 10),
      fullName: 'John Engineer',
      userRoles: {
        create: {
          roleId: engineerRole.id,
        },
      },
    },
  });

  const technicianUser = await prisma.user.upsert({
    where: { email: 'technician@example.com' },
    update: {},
    create: {
      email: 'technician@example.com',
      passwordHash: await bcrypt.hash('Tech@123', 10),
      fullName: 'Jane Technician',
      userRoles: {
        create: {
          roleId: technicianRole.id,
        },
      },
    },
  });

  // Create organizational hierarchy
  console.log('Creating organizational hierarchy...');
  const company = await prisma.company.upsert({
    where: { code: 'ACME' },
    update: {},
    create: {
      name: 'ACME Manufacturing',
      code: 'ACME',
    },
  });

  const site = await prisma.site.upsert({
    where: { companyId_code: { companyId: company.id, code: 'MAIN' } },
    update: {},
    create: {
      companyId: company.id,
      name: 'Main Plant',
      code: 'MAIN',
    },
  });

  const area = await prisma.area.upsert({
    where: { siteId_code: { siteId: site.id, code: 'PROD' } },
    update: {},
    create: {
      siteId: site.id,
      name: 'Production Area',
      code: 'PROD',
    },
  });

  const system = await prisma.system.upsert({
    where: { areaId_code: { areaId: area.id, code: 'PUMP' } },
    update: {},
    create: {
      areaId: area.id,
      name: 'Pumping System',
      code: 'PUMP',
    },
  });

  // Create assets
  console.log('Creating assets...');
  const asset1 = await prisma.asset.upsert({
    where: { systemId_tagCode: { systemId: system.id, tagCode: 'P-001' } },
    update: {},
    create: {
      systemId: system.id,
      name: 'Main Feed Pump',
      tagCode: 'P-001',
      criticality: 'high',
    },
  });

  const asset2 = await prisma.asset.upsert({
    where: { systemId_tagCode: { systemId: system.id, tagCode: 'P-002' } },
    update: {},
    create: {
      systemId: system.id,
      name: 'Backup Feed Pump',
      tagCode: 'P-002',
      criticality: 'medium',
    },
  });

  // Create components
  console.log('Creating components...');
  const component1 = await prisma.component.upsert({
    where: { assetId_componentCode: { assetId: asset1.id, componentCode: 'MOTOR' } },
    update: {},
    create: {
      assetId: asset1.id,
      name: 'Electric Motor',
      componentCode: 'MOTOR',
      type: 'electrical',
    },
  });

  const component2 = await prisma.component.upsert({
    where: { assetId_componentCode: { assetId: asset1.id, componentCode: 'IMPELLER' } },
    update: {},
    create: {
      assetId: asset1.id,
      name: 'Pump Impeller',
      componentCode: 'IMPELLER',
      type: 'rotating',
    },
  });

  const component3 = await prisma.component.upsert({
    where: { assetId_componentCode: { assetId: asset2.id, componentCode: 'BEARING' } },
    update: {},
    create: {
      assetId: asset2.id,
      name: 'Main Bearing',
      componentCode: 'BEARING',
      type: 'mechanical',
    },
  });

  // Create FMECA library data
  console.log('Creating FMECA library data...');
  const category = await prisma.fmecaCategory.upsert({
    where: { name: 'Rotating Equipment' },
    update: {},
    create: {
      name: 'Rotating Equipment',
      description: 'Failure modes for rotating machinery',
    },
  });

  const failureMode1 = await prisma.failureMode.upsert({
    where: { categoryId_code: { categoryId: category.id, code: 'BEARING_FAIL' } },
    update: {},
    create: {
      categoryId: category.id,
      code: 'BEARING_FAIL',
      title: 'Bearing Failure',
      description: 'Premature bearing failure due to various causes',
      typicalCauses: 'Inadequate lubrication, contamination, misalignment, overloading',
      typicalEffects: 'Increased vibration, noise, heat generation, eventual seizure',
      detectionMethods: 'Vibration monitoring, temperature monitoring, oil analysis',
    },
  });

  const failureMode2 = await prisma.failureMode.upsert({
    where: { categoryId_code: { categoryId: category.id, code: 'MOTOR_FAIL' } },
    update: {},
    create: {
      categoryId: category.id,
      code: 'MOTOR_FAIL',
      title: 'Motor Winding Failure',
      description: 'Electrical motor winding insulation breakdown',
      typicalCauses: 'Overheating, moisture ingress, voltage spikes, aging',
      typicalEffects: 'Motor trip, reduced efficiency, complete failure',
      detectionMethods: 'Motor current analysis, insulation resistance testing, thermography',
    },
  });

  // Create rating scales
  console.log('Creating rating scales...');
  const severityScale = await prisma.ratingScale.upsert({
    where: { name: 'Severity Scale' },
    update: {},
    create: {
      name: 'Severity Scale',
      dimension: 'severity',
      minValue: 1,
      maxValue: 10,
      description: 'Impact severity of failure mode',
    },
  });

  const occurrenceScale = await prisma.ratingScale.upsert({
    where: { name: 'Occurrence Scale' },
    update: {},
    create: {
      name: 'Occurrence Scale',
      dimension: 'occurrence',
      minValue: 1,
      maxValue: 10,
      description: 'Likelihood of failure occurrence',
    },
  });

  const detectabilityScale = await prisma.ratingScale.upsert({
    where: { name: 'Detectability Scale' },
    update: {},
    create: {
      name: 'Detectability Scale',
      dimension: 'detectability',
      minValue: 1,
      maxValue: 10,
      description: 'Ability to detect failure before it occurs',
    },
  });

  // Create rating scale values
  const severityValues = [
    { value: 1, label: 'Negligible', description: 'No noticeable effect' },
    { value: 3, label: 'Minor', description: 'Minor performance degradation' },
    { value: 5, label: 'Moderate', description: 'Noticeable performance loss' },
    { value: 7, label: 'Major', description: 'Significant performance loss' },
    { value: 10, label: 'Catastrophic', description: 'Complete system failure' },
  ];

  for (const sv of severityValues) {
    await prisma.ratingScaleValue.upsert({
      where: { scaleId_value: { scaleId: severityScale.id, value: sv.value } },
      update: {},
      create: {
        scaleId: severityScale.id,
        ...sv,
      },
    });
  }

  // Create criticality rule
  await prisma.criticalityRule.upsert({
    where: { name: 'default' },
    update: {},
    create: {
      name: 'default',
      description: 'Default RPN-based criticality classification',
      rpnThresholds: {
        low: [1, 99],
        medium: [100, 199],
        high: [200, 1000],
      },
      colorMap: {
        low: 'green',
        medium: 'amber',
        high: 'red',
      },
    },
  });

  // Create FMECA study
  console.log('Creating FMECA study...');
  const study = await prisma.fmecaStudy.create({
    data: {
      companyId: company.id,
      title: 'Main Feed Pump FMECA',
      scope: 'Comprehensive FMECA analysis of the main feed pump system including motor, impeller, and associated components',
      ownerUserId: engineerUser.id,
    },
  });

  // Create FMECA items
  console.log('Creating FMECA items...');
  await prisma.fmecaItem.create({
    data: {
      studyId: study.id,
      componentId: component1.id,
      function: 'Provide rotational power to pump impeller',
      failureModeId: failureMode2.id,
      effect: 'Pump stops, no flow, production halt',
      cause: 'Motor winding insulation breakdown due to overheating',
      detection: 'Motor current monitoring, temperature sensors',
      severity: 9,
      occurrence: 4,
      detectability: 3,
      rpn: 108,
      criticality: 'medium',
      recommendedActions: 'Implement motor current analysis, regular thermography',
      monitoringTechniques: 'motor_current,thermography',
    },
  });

  await prisma.fmecaItem.create({
    data: {
      studyId: study.id,
      componentId: component2.id,
      function: 'Transfer energy from motor to fluid',
      failureModeId: failureMode1.id,
      effect: 'Reduced efficiency, vibration, eventual failure',
      cause: 'Impeller imbalance due to erosion or cavitation',
      detection: 'Vibration monitoring, performance trending',
      severity: 6,
      occurrence: 5,
      detectability: 4,
      rpn: 120,
      criticality: 'medium',
      recommendedActions: 'Regular vibration monitoring, flow rate trending',
      monitoringTechniques: 'vibration,visual',
    },
  });

  await prisma.fmecaItem.create({
    data: {
      studyId: study.id,
      componentId: component3.id,
      function: 'Support rotating shaft',
      failureModeId: failureMode1.id,
      effect: 'Shaft seizure, catastrophic failure',
      cause: 'Bearing wear due to inadequate lubrication',
      detection: 'Vibration analysis, oil analysis, temperature monitoring',
      severity: 8,
      occurrence: 6,
      detectability: 2,
      rpn: 96,
      criticality: 'low',
      recommendedActions: 'Implement oil analysis program, vibration monitoring',
      monitoringTechniques: 'vibration,oil,thermography',
    },
  });

  // Create CM tasks
  console.log('Creating CM tasks...');
  const cmTask1 = await prisma.cmTask.create({
    data: {
      componentId: component1.id,
      technique: 'thermography',
      intervalDays: 30,
      procedure: 'Thermal imaging of motor housing and connections',
      acceptanceCriteria: 'Temperature rise < 40°C above ambient',
      nextDueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    },
  });

  const cmTask2 = await prisma.cmTask.create({
    data: {
      componentId: component2.id,
      technique: 'vibration',
      intervalDays: 14,
      procedure: 'Vibration measurement at bearing locations',
      acceptanceCriteria: 'Overall vibration < 4.5 mm/s RMS',
      nextDueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    },
  });

  // Create CM reading
  console.log('Creating CM reading...');
  await prisma.cmReading.create({
    data: {
      taskId: cmTask1.id,
      performedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      result: {
        maxTemperature: 65,
        ambientTemperature: 25,
        temperatureRise: 40,
        hotSpots: ['Terminal box connection'],
      },
      status: 'warning',
      notes: 'Slight temperature elevation at terminal connections, recommend inspection',
      performedByUserId: technicianUser.id,
    },
  });

  // Create actions
  console.log('Creating actions...');
  await prisma.action.create({
    data: {
      title: 'Inspect Motor Terminal Connections',
      description: 'Investigate elevated temperature at motor terminal connections found during thermography inspection',
      entityType: 'component',
      entityId: component1.id,
      assigneeUserId: technicianUser.id,
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      priority: 'high',
      createdByUserId: engineerUser.id,
    },
  });

  await prisma.action.create({
    data: {
      title: 'Update Vibration Monitoring Procedure',
      description: 'Review and update vibration monitoring procedures based on recent FMECA findings',
      entityType: 'component',
      entityId: component2.id,
      assigneeUserId: engineerUser.id,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      priority: 'medium',
      status: 'in_progress',
      createdByUserId: adminUser.id,
    },
  });

  await prisma.action.create({
    data: {
      title: 'Implement Oil Analysis Program',
      description: 'Set up regular oil analysis program for bearing lubrication monitoring',
      entityType: 'component',
      entityId: component3.id,
      priority: 'low',
      status: 'done',
      createdByUserId: engineerUser.id,
    },
  });

  console.log('✅ Database seed completed successfully!');
  console.log('');
  console.log('🔐 Login credentials:');
  console.log('Admin: admin@example.com / Admin@12345');
  console.log('Engineer: engineer@example.com / Engineer@123');
  console.log('Technician: technician@example.com / Tech@123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });