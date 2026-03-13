import { PrismaClient, Priority, ProjectStatus, WorkPackageStatus, DependencyType } from '@prisma/client';
import { addDays } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  await prisma.taskDependency.deleteMany();
  await prisma.schedulingEvent.deleteMany();
  await prisma.workPackage.deleteMany();
  await prisma.employeeAbsence.deleteMany();
  await prisma.employeeProfile.deleteMany();
  await prisma.project.deleteMany();
  await prisma.department.deleteMany();

  const deps = await Promise.all([
    prisma.department.create({ data: { name: 'Engineering', code: 'ENG' } }),
    prisma.department.create({ data: { name: 'Operations', code: 'OPS' } }),
    prisma.department.create({ data: { name: 'Finance', code: 'FIN' } }),
    prisma.department.create({ data: { name: 'Product', code: 'PRD' } })
  ]);

  const employees = await Promise.all(Array.from({ length: 8 }).map((_, idx) => prisma.employeeProfile.create({ data: {
    employeeName: ['Ana Müller','Jörg Klein','Lucía Pérez','Marta Gómez','Nils Bauer','Sven Koch','Julia Roth','David Álvarez'][idx],
    departmentId: deps[idx%4].id,
    role: 'Specialist',
    hourlyCost: 55 + idx * 5,
    weeklyCapacityHours: 40,
    workLocationCountryCode: 'DE',
    workLocationSubdivisionCode: idx < 5 ? 'BW' : undefined,
    active: true
  }})));

  await prisma.employeeAbsence.createMany({ data: [
    { employeeId: employees[0].employeeId, startDate: new Date('2026-01-12'), endDate: new Date('2026-01-14'), reason: 'Vacation' },
    { employeeId: employees[1].employeeId, startDate: new Date('2026-01-19'), endDate: new Date('2026-01-20'), reason: 'Sick leave' }
  ]});

  const projects = await Promise.all([
    prisma.project.create({ data: { projectName: 'Neckar ERP', projectCode: 'P-001', colorHex: '#2563eb', clientName: 'Neckar AG', status: ProjectStatus.ACTIVE } }),
    prisma.project.create({ data: { projectName: 'BW Compliance', projectCode: 'P-002', colorHex: '#16a34a', clientName: 'Land BW', status: ProjectStatus.ACTIVE } }),
    prisma.project.create({ data: { projectName: 'Logistics AI', projectCode: 'P-003', colorHex: '#dc2626', clientName: 'TransLog', status: ProjectStatus.PLANNED } }),
    prisma.project.create({ data: { projectName: 'CRM Lift', projectCode: 'P-004', colorHex: '#9333ea', clientName: 'Commerz', status: ProjectStatus.ACTIVE } }),
    prisma.project.create({ data: { projectName: 'Data Lake', projectCode: 'P-005', colorHex: '#f59e0b', clientName: 'AutoGroup', status: ProjectStatus.ON_HOLD } })
  ]);

  const base = new Date('2026-01-05');
  const tasks = [] as any[];
  for (let i=0;i<20;i++) {
    const employee = employees[i%8];
    const start = addDays(base, i * 2);
    tasks.push(await prisma.workPackage.create({ data: {
      departmentId: employee.departmentId,
      employeeId: employee.employeeId,
      title: `WP-${i+1}`,
      description: `Work package ${i+1}`,
      earliestStartDate: start,
      deadlineDate: addDays(start, 8),
      durationDays: i % 4 === 0 ? 5 : 3,
      scheduledStartDate: start,
      scheduledEndDateExclusive: addDays(start, (i % 4 === 0 ? 5 : 3)),
      priority: i === 6 ? Priority.MAXIMUM : (i%3===0 ? Priority.HIGH : Priority.NORMAL),
      projectId: projects[i%5].id,
      status: WorkPackageStatus.PLANNED,
      workLocationCountryCode: 'DE',
      workLocationSubdivisionCode: 'BW'
    }}));
  }

  // collision scenario
  await prisma.workPackage.create({ data: {
    departmentId: employees[0].departmentId,
    employeeId: employees[0].employeeId,
    title: 'Collision Candidate',
    description: 'Intentional overlap',
    earliestStartDate: new Date('2026-01-07'),
    deadlineDate: new Date('2026-01-15'),
    durationDays: 3,
    scheduledStartDate: new Date('2026-01-07'),
    scheduledEndDateExclusive: new Date('2026-01-10'),
    priority: Priority.NORMAL,
    projectId: projects[0].id,
    status: WorkPackageStatus.PLANNED,
    workLocationCountryCode: 'DE',
    workLocationSubdivisionCode: 'BW'
  }});

  // late task
  await prisma.workPackage.create({ data: {
    departmentId: employees[2].departmentId,
    employeeId: employees[2].employeeId,
    title: 'Late package',
    description: 'Will pass deadline',
    earliestStartDate: new Date('2026-02-10'),
    deadlineDate: new Date('2026-02-12'),
    durationDays: 6,
    scheduledStartDate: new Date('2026-02-10'),
    scheduledEndDateExclusive: new Date('2026-02-18'),
    priority: Priority.HIGH,
    projectId: projects[1].id,
    status: WorkPackageStatus.PLANNED,
    workLocationCountryCode: 'DE',
    workLocationSubdivisionCode: 'BW'
  }});

  await prisma.taskDependency.create({ data: { predecessorTaskId: tasks[0].id, successorTaskId: tasks[5].id, type: DependencyType.FS } });
  await prisma.taskDependency.create({ data: { predecessorTaskId: tasks[2].id, successorTaskId: tasks[8].id, type: DependencyType.SS } });

  console.log('Seed completed');
}

main().finally(() => prisma.$disconnect());
