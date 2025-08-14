import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // 1. Create Roles
  const rolesData = [
    { name: 'admin' },
    { name: 'reliability_engineer' },
    { name: 'maint_planner' },
    { name: 'technician' },
    { name: 'manager' },
    { name: 'viewer' },
  ];

  for (const role of rolesData) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
    console.log(`Upserted role: ${role.name}`);
  }

  const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
  if (!adminRole) {
    throw new Error('Admin role not found after seeding.');
  }

  // 2. Create Admin User
  const adminPassword = 'Admin@12345';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { password_hash: hashedPassword },
    create: {
      email: 'admin@example.com',
      password_hash: hashedPassword,
      full_name: 'Admin User',
      is_active: true,
    },
  });
  console.log(`Upserted admin user: ${adminUser.email}`);

  // Assign admin role to admin user
  await prisma.userRole.upsert({
    where: { user_id_role_id: { user_id: adminUser.id, role_id: adminRole.id } },
    update: {},
    create: {
      user_id: adminUser.id,
      role_id: adminRole.id,
    },
  });
  console.log(`Assigned admin role to ${adminUser.email}`);

  // 3. Create Company, Site, Area, System, Assets, Components
  const company = await prisma.company.upsert({
    where: { code: 'COMP001' },
    update: {},
    create: {
      name: 'Example Company',
      code: 'COMP001',
    },
  });
  console.log(`Upserted company: ${company.name}`);

  const site = await prisma.site.upsert({
    where: { company_id_code: { company_id: company.id, code: 'SITE001' } },
    update: {},
    create: {
      company_id: company.id,
      name: 'Main Site',
      code: 'SITE001',
    },
  });
  console.log(`Upserted site: ${site.name}`);

  const area = await prisma.area.upsert({
    where: { site_id_code: { site_id: site.id, code: 'AREA001' } },
    update: {},
    create: {
      site_id: site.id,
      name: 'Production Area',
      code: 'AREA001',
    },
  });
  console.log(`Upserted area: ${area.name}`);

  const system = await prisma.system.upsert({
    where: { area_id_code: { area_id: area.id, code: 'SYS001' } },
    update: {},
    create: {
      area_id: area.id,
      name: 'Conveyor System',
      code: 'SYS001',
    },
  });
  console.log(`Upserted system: ${system.name}`);

  const asset1 = await prisma.asset.upsert({
    where: { system_id_tag_code: { system_id: system.id, tag_code: 'ASSET001' } },
    update: {},
    create: {
      system_id: system.id,
      name: 'Conveyor Belt 1',
      tag_code: 'ASSET001',
      criticality: 'high',
    },
  });
  console.log(`Upserted asset: ${asset1.name}`);

  const asset2 = await prisma.asset.upsert({
    where: { system_id_tag_code: { system_id: system.id, tag_code: 'ASSET002' } },
    update: {},
    create: {
      system_id: system.id,
      name: 'Motor Drive Unit',
      tag_code: 'ASSET002',
      criticality: 'medium',
    },
  });
  console.log(`Upserted asset: ${asset2.name}`);

  const component1 = await prisma.component.upsert({
    where: { asset_id_component_code: { asset_id: asset1.id, component_code: 'COMP001' } },
    update: {},
    create: {
      asset_id: asset1.id,
      name: 'Belt Roller',
      component_code: 'COMP001',
      type: 'mechanical',
    },
  });
  console.log(`Upserted component: ${component1.name}`);

  const component2 = await prisma.component.upsert({
    where: { asset_id_component_code: { asset_id: asset1.id, component_code: 'COMP002' } },
    update: {},
    create: {
      asset_id: asset1.id,
      name: 'Belt Motor',
      component_code: 'COMP002',
      type: 'electrical',
    },
  });
  console.log(`Upserted component: ${component2.name}`);

  const component3 = await prisma.component.upsert({
    where: { asset_id_component_code: { asset_id: asset2.id, component_code: 'COMP003' } },
    update: {},
    create: {
      asset_id: asset2.id,
      name: 'Gearbox',
      component_code: 'COMP003',
      type: 'mechanical',
    },
  });
  console.log(`Upserted component: ${component3.name}`);

  // 4. Add sample failure modes, rating scales, and a basic criticality rule
  const fmecaCategory = await prisma.fmecaCategory.upsert({
    where: { name: 'Mechanical Failures' },
    update: {},
    create: {
      name: 'Mechanical Failures',
      description: 'Common failure modes for mechanical components.',
    },
  });
  console.log(`Upserted FMECA category: ${fmecaCategory.name}`);

  const failureMode1 = await prisma.failureMode.upsert({
    where: { category_id_code: { category_id: fmecaCategory.id, code: 'FM001' } },
    update: {},
    create: {
      category_id: fmecaCategory.id,
      code: 'FM001',
      title: 'Bearing Failure',
      description: 'Failure due to worn or damaged bearings.',
      typical_causes: 'Lack of lubrication, contamination, misalignment, excessive load.',
      typical_effects: 'Increased vibration, noise, overheating, eventual seizure.',
      detection_methods: 'Vibration analysis, thermography, acoustic emission, oil analysis.',
    },
  });
  console.log(`Upserted failure mode: ${failureMode1.title}`);

  const failureMode2 = await prisma.failureMode.upsert({
    where: { category_id_code: { category_id: fmecaCategory.id, code: 'FM002' } },
    update: {},
    create: {
      category_id: fmecaCategory.id,
      code: 'FM002',
      title: 'Belt Slippage',
      description: 'Loss of power transmission due to belt slippage.',
      typical_causes: 'Low tension, worn belt, oil contamination.',
      typical_effects: 'Reduced output, increased heat, belt wear.',
      detection_methods: 'Visual inspection, acoustic monitoring, motor current analysis.',
    },
  });
  console.log(`Upserted failure mode: ${failureMode2.title}`);

  // Rating Scales (1-10 for Severity, Occurrence, Detectability)
  const dimensions = ['severity', 'occurrence', 'detectability'];
  for (const dim of dimensions) {
    const scale = await prisma.ratingScale.upsert({
      where: { name: `${dim}_scale` },
      update: {},
      create: {
        name: `${dim}_scale`,
        dimension: dim,
        min_value: 1,
        max_value: 10,
        description: `Rating scale for ${dim}`,
      },
    });
    console.log(`Upserted rating scale: ${scale.name}`);

    for (let i = 1; i <= 10; i++) {
      await prisma.ratingScaleValue.upsert({
        where: { scale_id_value: { scale_id: scale.id, value: i } },
        update: {},
        create: {
          scale_id: scale.id,
          value: i,
          label: `Level ${i}`,
          description: `Description for level ${i}`,
        },
      });
    }
    console.log(`Upserted values for ${scale.name}`);
  }

  // Basic Criticality Rule
  const criticalityRule = await prisma.criticalityRule.upsert({
    where: { name: 'Standard RPN Criticality' },
    update: {},
    create: {
      name: 'Standard RPN Criticality',
      description: 'Defines criticality based on RPN values.',
      rpn_thresholds: {
        low: [0, 99],
        medium: [100, 199],
        high: [200, 1000],
      },
      color_map: {
        low: '#28a745', // green
        medium: '#ffc107', // amber
        high: '#dc3545', // red
      },
    },
  });
  console.log(`Upserted criticality rule: ${criticalityRule.name}`);

  // 5. Create a draft FMECA study with 3 items of varying RPN
  const fmecaStudy = await prisma.fmecaStudy.upsert({
    where: { title: 'Conveyor System FMECA Study' },
    update: {},
    create: {
      company_id: company.id,
      title: 'Conveyor System FMECA Study',
      scope: 'FMECA for the main production conveyor system.',
      status: 'draft',
      owner_user_id: adminUser.id,
    },
  });
  console.log(`Upserted FMECA study: ${fmecaStudy.title}`);

  // FMECA Items
  const fmecaItem1 = await prisma.fmecaItem.upsert({
    where: { study_id_component_id_failure_mode_id: { study_id: fmecaStudy.id, component_id: component1.id, failure_mode_id: failureMode1.id } },
    update: {},
    create: {
      study_id: fmecaStudy.id,
      component_id: component1.id,
      function: 'Support and guide conveyor belt.',
      failure_mode_id: failureMode1.id,
      effect: 'Belt seizure, production stoppage.',
      cause: 'Worn bearings due to lack of lubrication.',
      detection: 'Increased noise and vibration.',
      severity: 9,
      occurrence: 7,
      detectability: 3,
      rpn: 9 * 7 * 3, // 189 (medium)
      criticality: 'medium',
      recommended_actions: 'Implement regular lubrication schedule.',
      monitoring_techniques: ['vibration', 'oil'],
    },
  });
  console.log(`Upserted FMECA item 1 (RPN: ${fmecaItem1.rpn}): ${fmecaItem1.function}`);

  const fmecaItem2 = await prisma.fmecaItem.upsert({
    where: { study_id_component_id_failure_mode_id: { study_id: fmecaStudy.id, component_id: component2.id, failure_mode_id: failureMode2.id } },
    update: {},
    create: {
      study_id: fmecaStudy.id,
      component_id: component2.id,
      function: 'Drive conveyor belt.',
      failure_mode_id: failureMode2.id,
      effect: 'Reduced belt speed, product backlog.',
      cause: 'Belt slippage due to low tension.',
      detection: 'Visual inspection of belt tension.',
      severity: 5,
      occurrence: 6,
      detectability: 2,
      rpn: 5 * 6 * 2, // 60 (low)
      criticality: 'low',
      recommended_actions: 'Adjust belt tension regularly.',
      monitoring_techniques: ['visual', 'motor_current'],
    },
  });
  console.log(`Upserted FMECA item 2 (RPN: ${fmecaItem2.rpn}): ${fmecaItem2.function}`);

  const fmecaItem3 = await prisma.fmecaItem.upsert({
    where: { study_id_component_id_failure_mode_id: { study_id: fmecaStudy.id, component_id: component3.id, failure_mode_id: failureMode1.id } },
    update: {},
    create: {
      study_id: fmecaStudy.id,
      component_id: component3.id,
      function: 'Transmit power from motor to belt.',
      failure_mode_id: failureMode1.id,
      effect: 'Complete power loss, system shutdown.',
      cause: 'Catastrophic gearbox failure.',
      detection: 'Loud grinding noises, sudden stop.',
      severity: 10,
      occurrence: 8,
      detectability: 1,
      rpn: 10 * 8 * 1, // 80 (low)
      criticality: 'low',
      recommended_actions: 'Implement predictive maintenance for gearbox.',
      monitoring_techniques: ['vibration', 'oil', 'acoustic'],
    },
  });
  console.log(`Upserted FMECA item 3 (RPN: ${fmecaItem3.rpn}): ${fmecaItem3.function}`);

  // 6. Create 2 CM tasks and 1 reading
  const cmTask1 = await prisma.cmTask.upsert({
    where: { component_id_technique: { component_id: component1.id, technique: 'vibration' } },
    update: {},
    create: {
      component_id: component1.id,
      technique: 'vibration',
      interval_days: 30,
      procedure: 'Collect vibration data from bearing housing.',
      acceptance_criteria: 'Overall vibration velocity < 5 mm/s.',
      last_performed_at: new Date(new Date().setDate(new Date().getDate() - 10)), // 10 days ago
    },
  });
  console.log(`Upserted CM task 1: ${cmTask1.procedure}`);

  const cmTask2 = await prisma.cmTask.upsert({
    where: { component_id_technique: { component_id: component2.id, technique: 'visual' } },
    update: {},
    create: {
      component_id: component2.id,
      technique: 'visual',
      interval_days: 7,
      procedure: 'Visually inspect belt for wear and tension.',
      acceptance_criteria: 'No visible cracks, proper tension.',
      last_performed_at: new Date(new Date().setDate(new Date().getDate() - 3)), // 3 days ago
    },
  });
  console.log(`Upserted CM task 2: ${cmTask2.procedure}`);

  const cmReading1 = await prisma.cmReading.upsert({
    where: { task_id_performed_at: { task_id: cmTask1.id, performed_at: new Date(new Date().setDate(new Date().getDate() - 10)) } },
    update: {},
    create: {
      task_id: cmTask1.id,
      performed_at: new Date(new Date().setDate(new Date().getDate() - 10)),
      result: { overall_velocity: 3.2, frequency_peaks: [20, 40] },
      status: 'ok',
      notes: 'Bearing vibration within limits.',
      performed_by_user_id: adminUser.id,
    },
  });
  console.log(`Upserted CM reading 1 for task: ${cmReading1.task_id}`);

  // 7. Create 3 actions across statuses
  const action1 = await prisma.actions.upsert({
    where: { id: 'action1_id' }, // Using a fixed ID for upsert where clause for simplicity in seed
    update: {},
    create: {
      id: 'action1_id',
      title: 'Lubricate Conveyor Bearings',
      description: 'Perform lubrication on all conveyor belt bearings as per schedule.',
      entity_type: 'fmeca_item',
      entity_id: fmecaItem1.id,
      assignee_user_id: adminUser.id,
      due_date: new Date(new Date().setDate(new Date().getDate() + 7)), // 7 days from now
      priority: 'high',
      status: 'open',
      created_by_user_id: adminUser.id,
    },
  });
  console.log(`Upserted action 1: ${action1.title}`);

  const action2 = await prisma.actions.upsert({
    where: { id: 'action2_id' },
    update: {},
    create: {
      id: 'action2_id',
      title: 'Adjust Belt Tension',
      description: 'Check and adjust tension of conveyor belt 1.',
      entity_type: 'fmeca_item',
      entity_id: fmecaItem2.id,
      assignee_user_id: adminUser.id,
      due_date: new Date(new Date().setDate(new Date().getDate() + 3)), // 3 days from now
      priority: 'medium',
      status: 'in_progress',
      created_by_user_id: adminUser.id,
    },
  });
  console.log(`Upserted action 2: ${action2.title}`);

  const action3 = await prisma.actions.upsert({
    where: { id: 'action3_id' },
    update: {},
    create: {
      id: 'action3_id',
      title: 'Review Gearbox PM Schedule',
      description: 'Review existing PM schedule for gearbox on Motor Drive Unit.',
      entity_type: 'component',
      entity_id: component3.id,
      assignee_user_id: adminUser.id,
      due_date: new Date(new Date().setDate(new Date().getDate() - 5)), // 5 days ago (overdue/done)
      priority: 'low',
      status: 'done',
      created_by_user_id: adminUser.id,
    },
  });
  console.log(`Upserted action 3: ${action3.title}`);

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
