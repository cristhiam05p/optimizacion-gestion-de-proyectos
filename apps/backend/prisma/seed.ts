import { PrismaClient } from '@prisma/client';
import { addDays, startOfDay } from 'date-fns';

const Priority = { NORMAL: 'NORMAL', HIGH: 'HIGH', MAXIMUM: 'MAXIMUM' } as const;
const ProjectStatus = { ACTIVE: 'ACTIVE', PLANNED: 'PLANNED', ON_HOLD: 'ON_HOLD' } as const;
const WorkPackageStatus = { PLANNED: 'PLANNED', IN_PROGRESS: 'IN_PROGRESS', BLOCKED: 'BLOCKED' } as const;
const DependencyType = { FS: 'FS', SS: 'SS', FF: 'FF' } as const;

const prisma = new PrismaClient();
const SEED_TAG = '[dynamic-seed-v2]';

function nextWeekday(date: Date) {
  const current = startOfDay(new Date(date));
  while ([0, 6].includes(current.getDay())) current.setDate(current.getDate() + 1);
  return current;
}

function addWeekdays(date: Date, days: number) {
  const current = nextWeekday(date);
  let remaining = days;
  while (remaining > 0) {
    current.setDate(current.getDate() + 1);
    if (![0, 6].includes(current.getDay())) remaining -= 1;
  }
  return current;
}

async function main() {
  await prisma.taskDependency.deleteMany();
  await prisma.schedulingEvent.deleteMany();
  await prisma.workPackage.deleteMany();
  await prisma.employeeAbsence.deleteMany();
  await prisma.employeeProfile.deleteMany();
  await prisma.project.deleteMany();
  await prisma.department.deleteMany();

  const departments = await Promise.all([
    prisma.department.create({ data: { name: 'Engineering', code: 'ENG' } }),
    prisma.department.create({ data: { name: 'Operations', code: 'OPS' } }),
    prisma.department.create({ data: { name: 'Finance', code: 'FIN' } }),
    prisma.department.create({ data: { name: 'Product', code: 'PRD' } })
  ]);

  const employees = await Promise.all(['Ana Müller','Jörg Klein','Lucía Pérez','Marta Gómez','Nils Bauer','Sven Koch','Julia Roth','David Álvarez'].map((employeeName, idx) => prisma.employeeProfile.create({ data: {
    employeeName,
    departmentId: departments[idx % departments.length].id,
    role: idx < 4 ? 'Lead Specialist' : 'Specialist',
    hourlyCost: 55 + idx * 6,
    weeklyCapacityHours: 40,
    workLocationCountryCode: 'DE',
    workLocationSubdivisionCode: idx < 5 ? 'BW' : undefined,
    active: true
  } })));

  const today = nextWeekday(new Date());
  await prisma.employeeAbsence.createMany({ data: [
    { employeeId: employees[0].employeeId, startDate: addDays(today, 9), endDate: addDays(today, 11), reason: `${SEED_TAG} Vacation` },
    { employeeId: employees[1].employeeId, startDate: addDays(today, 14), endDate: addDays(today, 15), reason: `${SEED_TAG} Sick leave` }
  ]});

  const projectDefinitions = [
    { projectName: 'Neckar ERP', projectCode: 'P-001', colorHex: '#2563eb', clientName: 'Neckar AG', status: ProjectStatus.ACTIVE, startOffset: 0, endOffset: 72 },
    { projectName: 'BW Compliance', projectCode: 'P-002', colorHex: '#16a34a', clientName: 'Land BW', status: ProjectStatus.ACTIVE, startOffset: 5, endOffset: 88 },
    { projectName: 'CRM Lift', projectCode: 'P-003', colorHex: '#9333ea', clientName: 'Commerz', status: ProjectStatus.ACTIVE, startOffset: 12, endOffset: 98 },
    { projectName: 'Logistics AI', projectCode: 'P-004', colorHex: '#dc2626', clientName: 'TransLog', status: ProjectStatus.PLANNED, startOffset: 18, endOffset: 118 },
    { projectName: 'Data Lake', projectCode: 'P-005', colorHex: '#f59e0b', clientName: 'AutoGroup', status: ProjectStatus.ON_HOLD, startOffset: 22, endOffset: 128 }
  ];

  const projects = await Promise.all(projectDefinitions.map((project) => prisma.project.create({ data: {
    projectName: project.projectName,
    projectCode: project.projectCode,
    colorHex: project.colorHex,
    clientName: project.clientName,
    status: project.status,
    startDate: addDays(today, project.startOffset),
    estimatedEndDate: addDays(today, project.endOffset)
  } })));

  const createdTasks: any[] = [];
  for (let i = 0; i < 20; i += 1) {
    const employee = employees[i % employees.length];
    const project = projects[i % 4];
    const start = nextWeekday(addDays(today, i * 3));
    const durationDays = i % 4 === 0 ? 6 : i % 3 === 0 ? 4 : 3;
    createdTasks.push(await prisma.workPackage.create({ data: {
      departmentId: employee.departmentId,
      employeeId: employee.employeeId,
      title: `WP-${i + 1}`,
      description: `${SEED_TAG} Work package ${i + 1} for ${project.projectName}`,
      earliestStartDate: start,
      deadlineDate: addWeekdays(start, durationDays + 4),
      durationDays,
      scheduledStartDate: start,
      scheduledEndDateExclusive: addDays(addWeekdays(start, durationDays - 1), 1),
      priority: i === 6 ? Priority.MAXIMUM : (i % 3 === 0 ? Priority.HIGH : Priority.NORMAL),
      projectId: project.id,
      status: i < 4 ? WorkPackageStatus.IN_PROGRESS : WorkPackageStatus.PLANNED,
      workLocationCountryCode: 'DE',
      workLocationSubdivisionCode: 'BW'
    } }));
  }

  await prisma.workPackage.create({ data: {
    departmentId: employees[0].departmentId,
    employeeId: employees[0].employeeId,
    title: 'Collision Candidate',
    description: `${SEED_TAG} Intentional overlap candidate`,
    earliestStartDate: addDays(today, 4),
    deadlineDate: addDays(today, 10),
    durationDays: 3,
    scheduledStartDate: addDays(today, 4),
    scheduledEndDateExclusive: addDays(today, 7),
    priority: Priority.NORMAL,
    projectId: projects[0].id,
    status: WorkPackageStatus.BLOCKED,
    workLocationCountryCode: 'DE',
    workLocationSubdivisionCode: 'BW'
  }});

  await prisma.workPackage.create({ data: {
    departmentId: employees[2].departmentId,
    employeeId: employees[2].employeeId,
    title: 'Late package',
    description: `${SEED_TAG} Should exceed planned end`,
    earliestStartDate: addDays(today, 28),
    deadlineDate: addDays(today, 30),
    durationDays: 7,
    scheduledStartDate: addDays(today, 28),
    scheduledEndDateExclusive: addDays(today, 36),
    priority: Priority.HIGH,
    projectId: projects[1].id,
    status: WorkPackageStatus.PLANNED,
    workLocationCountryCode: 'DE',
    workLocationSubdivisionCode: 'BW'
  }});

  await prisma.taskDependency.createMany({ data: [
    { predecessorTaskId: createdTasks[0].id, successorTaskId: createdTasks[5].id, type: DependencyType.FS, offsetDays: 2 },
    { predecessorTaskId: createdTasks[2].id, successorTaskId: createdTasks[8].id, type: DependencyType.SS, offsetDays: 0 },
    { predecessorTaskId: createdTasks[4].id, successorTaskId: createdTasks[10].id, type: DependencyType.FF, offsetDays: 1 },
    { predecessorTaskId: createdTasks[6].id, successorTaskId: createdTasks[14].id, type: DependencyType.FS, offsetDays: 0 }
  ]});

  console.log('Seed completed with dynamic future-ready data');
}

main().finally(() => prisma.$disconnect());
