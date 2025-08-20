import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

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
  const hashedPassword = await bcrypt.hash('Admin@12345', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password_hash: hashedPassword,
      full_name: 'System Administrator',
      is_active: true,
    },
  });

  // Assign admin role
  await prisma.userRole.upsert({
    where: {
      user_id_role_id: {
        user_id: adminUser.id,
        role_id: roles[0].id, // admin role
      },
    },
    update: {},
    create: {
      user_id: adminUser.id,
      role_id: roles[0].id,
    },
  });

  // Create sample users
  console.log('Creating sample users...');
  const engineerPassword = await bcrypt.hash('Engineer@123', 10);
  const engineerUser = await prisma.user.upsert({
    where: { email: 'engineer@example.com' },
    update: {},
    create: {
      email: 'engineer@example.com',
      password_hash: engineerPassword,
      full_name: 'John Engineer',
      is_active: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      user_id_role_id: {
        user_id: engineerUser.id,
        role_id: roles[1].id, // reliability_engineer role
      },
    },
    update: {},
    create: {
      user_id: engineerUser.id,
      role_id: roles[1].id,
    },
  });

  const technicianPassword = await bcrypt.hash('Tech@123', 10);
  const technicianUser = await prisma.user.upsert({
    where: { email: 'technician@example.com' },
    update: {},
    create: {
      email: 'technician@example.com',
      password_hash: technicianPassword,
      full_name: 'Jane Technician',
      is_active: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      user_id_role_id: {
        user_id: technicianUser.id,
        role_id: roles[3].id, // technician role
      },
    },
    update: {},
    create: {
      user_id: technicianUser.id,
      role_id: roles[3].id,
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
    where: {
      company_id_code: {
        company_id: company.id,
        code: 'MAIN',
      },
    },
    update: {},
    create: {
      company_id: company.id,
      name: 'Main Plant',
      code: 'MAIN',
    },
  });

  const area = await prisma.area.upsert({
    where: {
      site_id_code: {
        site_id: site.id,
        code: 'PROD',
      },
    },
    update: {},
    create: {
      site_id: site.id,
      name: 'Production Area',
      code: 'PROD',
    },
  });

  const system = await prisma.system.upsert({
    where: {
      area_id_code: {
        area_id: area.id,
        code: 'CONV',
      },
    },
    update: {},
    create: {
      area_id: area.id,
      name: 'Conveyor System',
      code: 'CONV',
    },
  });

  // Create assets
  console.log('Creating assets...');
  const asset1 = await prisma.asset.upsert({
    where: {
      system_id_tag_code: {
        system_id: system.id,
        tag_code: 'CONV-001',
      },
    },
    update: {},
    create: {
      system_id: system.id,
      name: 'Main Conveyor Belt',
      tag_code: 'CONV-001',
      criticality: 'high',
    },
  });

  const asset2 = await prisma.asset.upsert({
    where: {
      system_id_tag_code: {
        system_id: system.id,
        tag_code: 'CONV-002',
      },
    },
    update: {},
    create: {
      system_id: system.id,
      name: 'Secondary Conveyor',
      tag_code: 'CONV-002',
      criticality: 'medium',
    },
  });

  // Create components
  console.log('Creating components...');
  const component1 = await prisma.component.upsert({
    where: {
      asset_id_component_code: {
        asset_id: asset1.id,
        component_code: 'MOTOR-001',
      },
    },
    update: {},
    create: {
      asset_id: asset1.id,
      name: 'Drive Motor',
      component_code: 'MOTOR-001',
      type: 'rotating',
    },
  });

  const component2 = await prisma.component.upsert({
    where: {
      asset_id_component_code: {
        asset_id: asset1.id,
        component_code: 'BELT-001',
      },
    },
    update: {},
    create: {
      asset_id: asset1.id,
      name: 'Conveyor Belt',
      component_code: 'BELT-001',
      type: 'mechanical',
    },
  });

  const component3 = await prisma.component.upsert({
    where: {
      asset_id_component_code: {
        asset_id: asset2.id,
        component_code: 'MOTOR-002',
      },
    },
    update: {},
    create: {
      asset_id: asset2.id,
      name: 'Drive Motor',
      component_code: 'MOTOR-002',
      type: 'rotating',
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
    where: {
      category_id_code: {
        category_id: category.id,
        code: 'BEAR-FAIL',
      },
    },
    update: {},
    create: {
      category_id: category.id,
      code: 'BEAR-FAIL',
      title: 'Bearing Failure',
      description: 'Bearing degradation leading to failure',
      typical_causes: 'Lack of lubrication, contamination, overloading',
      typical_effects: 'Increased vibration, noise, eventual seizure',
      detection_methods: 'vibration,thermography,oil',
    },
  });

  const failureMode2 = await prisma.failureMode.upsert({
    where: {
      category_id_code: {
        category_id: category.id,
        code: 'ALIGN-FAIL',
      },
    },
    update: {},
    create: {
      category_id: category.id,
      code: 'ALIGN-FAIL',
      title: 'Misalignment',
      description: 'Shaft misalignment causing premature wear',
      typical_causes: 'Installation error, thermal growth, foundation settling',
      typical_effects: 'Increased vibration, bearing wear, coupling failure',
      detection_methods: 'vibration,visual',
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
      min_value: 1,
      max_value: 10,
      description: 'Impact severity of failure mode',
    },
  });

  const occurrenceScale = await prisma.ratingScale.upsert({
    where: { name: 'Occurrence Scale' },
    update: {},
    create: {
      name: 'Occurrence Scale',
      dimension: 'occurrence',
      min_value: 1,
      max_value: 10,
      description: 'Likelihood of failure occurrence',
    },
  });

  const detectabilityScale = await prisma.ratingScale.upsert({
    where: { name: 'Detectability Scale' },
    update: {},
    create: {
      name: 'Detectability Scale',
      dimension: 'detectability',
      min_value: 1,
      max_value: 10,
      description: 'Ability to detect failure before it occurs',
    },
  });

  // Create rating scale values
  for (let i = 1; i <= 10; i++) {
    await prisma.ratingScaleValue.upsert({
      where: {
        scale_id_value: {
          scale_id: severityScale.id,
          value: i,
        },
      },
      update: {},
      create: {
        scale_id: severityScale.id,
        value: i,
        label: `Severity ${i}`,
        description: `Severity level ${i}`,
      },
    });

    await prisma.ratingScaleValue.upsert({
      where: {
        scale_id_value: {
          scale_id: occurrenceScale.id,
          value: i,
        },
      },
      update: {},
      create: {
        scale_id: occurrenceScale.id,
        value: i,
        label: `Occurrence ${i}`,
        description: `Occurrence level ${i}`,
      },
    });

    await prisma.ratingScaleValue.upsert({
      where: {
        scale_id_value: {
          scale_id: detectabilityScale.id,
          value: i,
        },
      },
      update: {},
      create: {
        scale_id: detectabilityScale.id,
        value: i,
        label: `Detectability ${i}`,
        description: `Detectability level ${i}`,
      },
    });
  }

  // Create criticality rule
  console.log('Creating criticality rule...');
  await prisma.criticalityRule.upsert({
    where: { name: 'Default' },
    update: {},
    create: {
      name: 'Default',
      description: 'Default criticality thresholds',
      rpn_thresholds: {
        low: { min: 1, max: 99 },
        medium: { min: 100, max: 199 },
        high: { min: 200, max: 1000 },
      },
      color_map: {
        low: '#198754',
        medium: '#ffc107',
        high: '#dc3545',
      },
    },
  });

  // Create FMECA study
  console.log('Creating FMECA study...');
  const study = await prisma.fmecaStudy.upsert({
    where: { id: 'study-1' },
    update: {},
    create: {
      id: 'study-1',
      company_id: company.id,
      title: 'Conveyor System FMECA',
      scope: 'Analysis of main conveyor system failure modes',
      status: 'draft',
      owner_user_id: engineerUser.id,
    },
  });

  // Create FMECA items
  console.log('Creating FMECA items...');
  await prisma.fmecaItem.upsert({
    where: { id: 'item-1' },
    update: {},
    create: {
      id: 'item-1',
      study_id: study.id,
      component_id: component1.id,
      function: 'Provide rotational power to conveyor belt',
      failure_mode_id: failureMode1.id,
      effect: 'Conveyor stops, production halt',
      cause: 'Bearing degradation due to lack of lubrication',
      detection: 'Vibration monitoring, temperature monitoring',
      severity: 8,
      occurrence: 4,
      detectability: 3,
      rpn: 96, // 8 * 4 * 3
      criticality: 'low',
      recommended_actions: 'Implement vibration monitoring program',
      monitoring_techniques: ['vibration', 'thermography'],
    },
  });

  await prisma.fmecaItem.upsert({
    where: { id: 'item-2' },
    update: {},
    create: {
      id: 'item-2',
      study_id: study.id,
      component_id: component1.id,
      function: 'Provide rotational power to conveyor belt',
      failure_mode_id: failureMode2.id,
      effect: 'Increased vibration, premature bearing failure',
      cause: 'Installation error during maintenance',
      detection: 'Vibration analysis, visual inspection',
      severity: 6,
      occurrence: 5,
      detectability: 4,
      rpn: 120, // 6 * 5 * 4
      criticality: 'medium',
      recommended_actions: 'Improve alignment procedures',
      monitoring_techniques: ['vibration'],
    },
  });

  await prisma.fmecaItem.upsert({
    where: { id: 'item-3' },
    update: {},
    create: {
      id: 'item-3',
      study_id: study.id,
      component_id: component2.id,
      function: 'Transport materials along conveyor',
      failure_mode_id: failureMode1.id,
      effect: 'Belt breakage, material spillage',
      cause: 'Excessive tension, wear, contamination',
      detection: 'Visual inspection, tension monitoring',
      severity: 7,
      occurrence: 6,
      detectability: 5,
      rpn: 210, // 7 * 6 * 5
      criticality: 'high',
      recommended_actions: 'Regular belt inspection and replacement program',
      monitoring_techniques: ['visual'],
    },
  });

  // Create CM tasks
  console.log('Creating CM tasks...');
  const cmTask1 = await prisma.cmTask.upsert({
    where: { id: 'task-1' },
    update: {},
    create: {
      id: 'task-1',
      component_id: component1.id,
      technique: 'vibration',
      interval_days: 30,
      procedure: 'Collect vibration data using accelerometer',
      acceptance_criteria: 'Overall vibration < 4.5 mm/s RMS',
      next_due_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    },
  });

  const cmTask2 = await prisma.cmTask.upsert({
    where: { id: 'task-2' },
    update: {},
    create: {
      id: 'task-2',
      component_id: component1.id,
      technique: 'thermography',
      interval_days: 90,
      procedure: 'Thermal imaging of motor and bearings',
      acceptance_criteria: 'Temperature rise < 40°C above ambient',
      next_due_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    },
  });

  // Create CM reading
  console.log('Creating CM reading...');
  await prisma.cmReading.upsert({
    where: { id: 'reading-1' },
    update: {},
    create: {
      id: 'reading-1',
      task_id: cmTask1.id,
      performed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      result: {
        overall_vibration: 3.2,
        bearing_frequency: 2.1,
        temperature: 65,
      },
      status: 'ok',
      notes: 'Normal operating conditions',
      performed_by_user_id: technicianUser.id,
    },
  });

  // Update task last performed date
  await prisma.cmTask.update({
    where: { id: cmTask1.id },
    data: {
      last_performed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      next_due_at: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // 25 days from now
    },
  });

  // Create actions
  console.log('Creating actions...');
  await prisma.action.upsert({
    where: { id: 'action-1' },
    update: {},
    create: {
      id: 'action-1',
      title: 'Implement vibration monitoring program',
      description: 'Set up continuous vibration monitoring for critical motors',
      entity_type: 'fmeca_item',
      entity_id: 'item-1',
      assignee_user_id: technicianUser.id,
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      priority: 'high',
      status: 'open',
      created_by_user_id: engineerUser.id,
    },
  });

  await prisma.action.upsert({
    where: { id: 'action-2' },
    update: {},
    create: {
      id: 'action-2',
      title: 'Review alignment procedures',
      description: 'Update maintenance procedures for motor alignment',
      entity_type: 'fmeca_item',
      entity_id: 'item-2',
      assignee_user_id: engineerUser.id,
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      priority: 'medium',
      status: 'in_progress',
      created_by_user_id: adminUser.id,
    },
  });

  await prisma.action.upsert({
    where: { id: 'action-3' },
    update: {},
    create: {
      id: 'action-3',
      title: 'Replace conveyor belt',
      description: 'Replace worn conveyor belt on CONV-001',
      entity_type: 'component',
      entity_id: component2.id,
      assignee_user_id: technicianUser.id,
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      priority: 'urgent',
      status: 'done',
      created_by_user_id: engineerUser.id,
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log('\n📋 Login credentials:');
  console.log('Admin: admin@example.com / Admin@12345');
  console.log('Engineer: engineer@example.com / Engineer@123');
  console.log('Technician: technician@example.com / Tech@123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });