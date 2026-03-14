import { Injectable } from '@nestjs/common';
import { Prisma, Priority } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SchedulingService } from '../scheduling/scheduling.service';
import { DomainError } from '../common/domain-error';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService, private scheduling: SchedulingService) {}

  list() {
    return this.prisma.workPackage.findMany({ include: { project: true, employee: true, predecessorDeps: { include: { predecessor: true } }, schedulingEvents: true } });
  }
  get(id: string) {
    return this.prisma.workPackage.findUnique({ where: { id }, include: { project: true, employee: true, predecessorDeps: { include: { predecessor: true } }, successorDeps: { include: { successor: true } }, schedulingEvents: true } });
  }


  private normalizeDateInput(value: unknown): Date {
    if (value instanceof Date) return new Date(value);
    if (typeof value === 'string') {
      const normalized = value.length >= 10 ? value.slice(0, 10) : value;
      return new Date(`${normalized}T00:00:00.000Z`);
    }
    return new Date(value as any);
  }

  async validate(data: any, existingId?: string) {
    const employee = await this.prisma.employeeProfile.findUniqueOrThrow({ where: { employeeId: data.employeeId }, include: { absences: true } });
    const tasks = await this.prisma.workPackage.findMany({ where: { employeeId: data.employeeId } });
    const locationCountry = data.workLocationCountryCode || employee.workLocationCountryCode;
    const locationSubdivision = data.workLocationSubdivisionCode || employee.workLocationSubdivisionCode || undefined;

    const normalizedStart = this.normalizeDateInput(data.earliestStartDate);
    const normalizedDeadline = this.normalizeDateInput(data.deadlineDate);

    const start = this.scheduling.getNextWorkingDay(normalizedStart, locationCountry, locationSubdivision, employee.absences);
    const deps = data.dependencies?.length
      ? (await this.prisma.taskDependency.findMany({ where: { successorTaskId: existingId || 'none' }, include: { predecessor: true } })).map((d) => ({ type: d.type, predecessor: d.predecessor }))
      : [];
    const resolvedStart = this.scheduling.resolveDependencies(start, deps as any);
    const scheduled = this.scheduling.findEarliestFeasibleStart(resolvedStart, tasks.filter((t) => t.id !== existingId), data.durationDays, locationCountry, locationSubdivision, employee.absences);

    const collisions = this.scheduling.detectTaskCollisions({ employeeId: data.employeeId, scheduledStartDate: scheduled.start, scheduledEndDateExclusive: scheduled.endExclusive, id: existingId }, tasks);
    const deadlineRisk = this.scheduling.deadlineRisk(normalizedDeadline, scheduled.endExclusive);

    return { scheduled, collisions, deadlineRisk, locationCountry, locationSubdivision };
  }

  async create(data: Prisma.WorkPackageCreateInput & { resolution?: string }) {
    const normalizedDates = {
      earliestStartDate: this.normalizeDateInput((data as any).earliestStartDate),
      deadlineDate: this.normalizeDateInput((data as any).deadlineDate)
    };
    const payload = { ...data, ...normalizedDates };
    const validation = await this.validate(payload as any);
    if (validation.collisions.length && payload.priority !== Priority.MAXIMUM && payload.resolution !== 'delay-new-task') {
      throw new DomainError('TASK_COLLISION', {
        conflicts: validation.collisions.map((c) => ({ taskId: c.id, title: c.title, overlap: [validation.scheduled.start, validation.scheduled.endExclusive] }))
      });
    }
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.workPackage.create({ data: { ...payload, scheduledStartDate: validation.scheduled.start, scheduledEndDateExclusive: validation.scheduled.endExclusive } });
      await tx.schedulingEvent.create({ data: { workPackageId: created.id, eventType: validation.deadlineRisk ? 'DEADLINE_RISK' : 'SCHEDULED', payloadJson: validation } });
      if (created.priority === Priority.MAXIMUM) {
        const employeeTasks = await tx.workPackage.findMany({ where: { employeeId: created.employeeId } });
        const employee = await tx.employeeProfile.findUniqueOrThrow({ where: { employeeId: created.employeeId }, include: { absences: true } });
        const updates = this.scheduling.cascadeReschedule(created, employeeTasks, validation.locationCountry, validation.locationSubdivision, employee.absences);
        for (const u of updates) {
          await tx.workPackage.update({ where: { id: u.id }, data: { scheduledStartDate: u.start, scheduledEndDateExclusive: u.endExclusive } });
          await tx.schedulingEvent.create({ data: { workPackageId: u.id, eventType: 'CASCADE_POSTPONED', payloadJson: u as any } });
        }
      }
      return created;
    });
  }

  async update(id: string, data: any) {
    const current = await this.prisma.workPackage.findUniqueOrThrow({ where: { id } });
    const normalizedData = {
      ...data,
      ...(data.earliestStartDate ? { earliestStartDate: this.normalizeDateInput(data.earliestStartDate) } : {}),
      ...(data.deadlineDate ? { deadlineDate: this.normalizeDateInput(data.deadlineDate) } : {})
    };
    const merged = { ...current, ...normalizedData };
    const validation = await this.validate(merged, id);
    if (validation.collisions.length && normalizedData.resolution !== 'delay-new-task' && merged.priority !== Priority.MAXIMUM) {
      throw new DomainError('EMPLOYEE_OVERBOOKED', { conflicts: validation.collisions.map((c) => ({ id: c.id, title: c.title })) });
    }
    return this.prisma.workPackage.update({ where: { id }, data: { ...normalizedData, scheduledStartDate: validation.scheduled.start, scheduledEndDateExclusive: validation.scheduled.endExclusive } });
  }

  remove(id: string) { return this.prisma.workPackage.delete({ where: { id } }); }

  async reschedule(id: string) {
    const task = await this.prisma.workPackage.findUniqueOrThrow({ where: { id } });
    return this.update(id, { earliestStartDate: task.scheduledStartDate });
  }
}
