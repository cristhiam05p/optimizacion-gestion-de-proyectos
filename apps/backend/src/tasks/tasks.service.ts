import { Injectable } from '@nestjs/common';
type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';
type WorkPackage = any;
const Priority = { LOW: 'LOW', NORMAL: 'NORMAL', HIGH: 'HIGH', MAXIMUM: 'MAXIMUM' } as const;
import { PrismaService } from '../prisma/prisma.service';
import { SchedulingService } from '../scheduling/scheduling.service';
import { DomainError } from '../common/domain-error';

type DependencyInput = {
  predecessorTaskId: string;
  dependencyType?: DependencyType;
  type?: DependencyType;
  offsetDays?: number;
};

type ValidatedDependency = {
  predecessorTaskId: string;
  type: DependencyType;
  offsetDays: number;
  predecessor: WorkPackage;
};

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService, private scheduling: SchedulingService) {}

  list() {
    return this.prisma.workPackage.findMany({
      include: {
        project: true,
        employee: true,
        predecessorDeps: { include: { predecessor: true } },
        successorDeps: { include: { successor: true } },
        schedulingEvents: true
      }
    });
  }

  get(id: string) {
    return this.prisma.workPackage.findUnique({
      where: { id },
      include: {
        project: true,
        employee: true,
        predecessorDeps: { include: { predecessor: true } },
        successorDeps: { include: { successor: true } },
        schedulingEvents: true
      }
    });
  }

  private normalizeDateInput(value: unknown): Date {
    if (value instanceof Date) return new Date(value);
    if (typeof value === 'string') {
      const normalized = value.length >= 10 ? value.slice(0, 10) : value;
      return new Date(`${normalized}T00:00:00.000Z`);
    }
    return new Date(value as any);
  }

  private normalizeDependencies(dependencies: DependencyInput[] | undefined): Array<{ predecessorTaskId: string; type: DependencyType; offsetDays: number }> {
    return (dependencies || [])
      .filter((dep) => dep?.predecessorTaskId)
      .map((dep) => ({
        predecessorTaskId: dep.predecessorTaskId,
        type: dep.dependencyType || dep.type || 'FS',
        offsetDays: Number(dep.offsetDays || 0)
      }));
  }

  private formatDependencyRule(dep: { predecessor: WorkPackage; type: DependencyType; offsetDays: number }) {
    const offset = dep.offsetDays === 0 ? '' : dep.offsetDays > 0 ? ` ${dep.offsetDays} día(s) después` : ` ${Math.abs(dep.offsetDays)} día(s) antes`;
    if (dep.type === 'FS') return `La tarea "${dep.predecessor.title}" debe finalizar${offset} antes de iniciar esta tarea.`;
    if (dep.type === 'SS') return `La tarea "${dep.predecessor.title}" debe iniciar${offset} antes de iniciar esta tarea.`;
    if (dep.type === 'FF') return `La tarea "${dep.predecessor.title}" debe finalizar${offset} antes de finalizar esta tarea.`;
    return `La tarea "${dep.predecessor.title}" debe iniciar${offset} antes de finalizar esta tarea.`;
  }

  private async assertNoCycles(successorTaskId: string, dependencies: Array<{ predecessorTaskId: string }>) {
    if (!successorTaskId || !dependencies.length) return;
    const allDeps = await this.prisma.taskDependency.findMany();
    const adjacency = new Map<string, string[]>();
    for (const dep of allDeps) {
      if (!adjacency.has(dep.predecessorTaskId)) adjacency.set(dep.predecessorTaskId, []);
      adjacency.get(dep.predecessorTaskId)!.push(dep.successorTaskId);
    }
    for (const dep of dependencies) {
      if (!adjacency.has(dep.predecessorTaskId)) adjacency.set(dep.predecessorTaskId, []);
      adjacency.get(dep.predecessorTaskId)!.push(successorTaskId);
    }

    const visit = (node: string, seen = new Set<string>()): boolean => {
      if (node === successorTaskId && seen.size > 0) return true;
      if (seen.has(node)) return false;
      seen.add(node);
      for (const next of adjacency.get(node) || []) {
        if (visit(next, new Set(seen))) return true;
      }
      return false;
    };

    for (const dep of dependencies) {
      if (dep.predecessorTaskId === successorTaskId || visit(dep.predecessorTaskId)) {
        throw new DomainError('TASK_DEPENDENCY_CYCLE', {
          message: 'No se puede guardar la dependencia porque genera un ciclo entre paquetes de trabajo.'
        });
      }
    }
  }

  private async hydrateDependencies(dependencies: Array<{ predecessorTaskId: string; type: DependencyType; offsetDays: number }>, existingId?: string): Promise<ValidatedDependency[]> {
    if (!dependencies.length) return [];
    const predecessorIds = [...new Set(dependencies.map((dep) => dep.predecessorTaskId))];
    if (existingId && predecessorIds.includes(existingId)) {
      throw new DomainError('TASK_SELF_DEPENDENCY', { message: 'Una tarea no puede depender de sí misma.' });
    }
    const predecessors = await this.prisma.workPackage.findMany({ where: { id: { in: predecessorIds } } });
    if (predecessors.length !== predecessorIds.length) {
      throw new DomainError('TASK_DEPENDENCY_NOT_FOUND', { message: 'Una de las tareas predecesoras seleccionadas no existe.' });
    }
    if (existingId) await this.assertNoCycles(existingId, dependencies);
    return dependencies.map((dep) => ({
      predecessorTaskId: dep.predecessorTaskId,
      type: dep.type,
      offsetDays: dep.offsetDays,
      predecessor: predecessors.find((task: WorkPackage) => task.id === dep.predecessorTaskId)!
    }));
  }

  private async getStoredDependencies(taskId: string): Promise<ValidatedDependency[]> {
    const deps = await this.prisma.taskDependency.findMany({ where: { successorTaskId: taskId }, include: { predecessor: true } });
    return deps.map((dep: any) => ({ predecessorTaskId: dep.predecessorTaskId, type: dep.type as DependencyType, offsetDays: dep.offsetDays, predecessor: dep.predecessor }));
  }

  private computeDependencyMinimumStart(start: Date, dependencies: ValidatedDependency[], country: string, subdivision: string | undefined, absences: any[]) {
    return dependencies.reduce((acc, dep) => {
      const candidate = this.scheduling.resolveDependencyStart(acc, dep, country, subdivision, absences);
      return candidate > acc ? candidate : acc;
    }, start);
  }

  async validate(data: any, existingId?: string) {
    const employee = await this.prisma.employeeProfile.findUniqueOrThrow({ where: { employeeId: data.employeeId }, include: { absences: true } });
    const tasks = await this.prisma.workPackage.findMany({ where: { employeeId: data.employeeId } });
    const locationCountry = data.workLocationCountryCode || employee.workLocationCountryCode;
    const locationSubdivision = data.workLocationSubdivisionCode || employee.workLocationSubdivisionCode || undefined;

    const normalizedStart = this.normalizeDateInput(data.earliestStartDate);
    const normalizedDeadline = this.normalizeDateInput(data.deadlineDate);
    const baseStart = this.scheduling.getNextWorkingDay(normalizedStart, locationCountry, locationSubdivision, employee.absences);
    const dependencyInputs = this.normalizeDependencies(data.dependencies);
    const dependencies = dependencyInputs.length
      ? await this.hydrateDependencies(dependencyInputs, existingId)
      : existingId
        ? await this.getStoredDependencies(existingId)
        : [];

    const minimumDependencyStart = this.computeDependencyMinimumStart(baseStart, dependencies, locationCountry, locationSubdivision, employee.absences);
    if (baseStart < minimumDependencyStart) {
      const blockingDependency = dependencies.find((dep) => this.scheduling.resolveDependencyStart(baseStart, dep, locationCountry, locationSubdivision, employee.absences).getTime() === minimumDependencyStart.getTime()) || dependencies[0];
      throw new DomainError('TASK_DEPENDENCY_VIOLATION', {
        message: `La fecha de inicio viola una dependencia. ${this.formatDependencyRule(blockingDependency)}`,
        dependency: {
          predecessorTaskId: blockingDependency.predecessorTaskId,
          predecessorTitle: blockingDependency.predecessor.title,
          type: blockingDependency.type,
          offsetDays: blockingDependency.offsetDays,
          minimumStartDate: minimumDependencyStart
        }
      });
    }

    const scheduled = this.scheduling.findEarliestFeasibleStart(minimumDependencyStart, tasks.filter((t: WorkPackage) => t.id !== existingId), data.durationDays, locationCountry, locationSubdivision, employee.absences);
    const collisions = this.scheduling.detectTaskCollisions({ employeeId: data.employeeId, scheduledStartDate: scheduled.start, scheduledEndDateExclusive: scheduled.endExclusive, id: existingId }, tasks);
    const deadlineRisk = this.scheduling.deadlineRisk(normalizedDeadline, scheduled.endExclusive);

    return { scheduled, collisions, deadlineRisk, locationCountry, locationSubdivision, dependencies };
  }

  private async syncDependencies(tx: any, taskId: string, dependencies: Array<{ predecessorTaskId: string; type: DependencyType; offsetDays: number }> | undefined) {
    if (!dependencies) return;
    await tx.taskDependency.deleteMany({ where: { successorTaskId: taskId } });
    if (!dependencies.length) return;
    await tx.taskDependency.createMany({
      data: dependencies.map((dep) => ({
        successorTaskId: taskId,
        predecessorTaskId: dep.predecessorTaskId,
        type: dep.type,
        offsetDays: dep.offsetDays
      }))
    });
  }

  private async rescheduleDependentChain(tx: any, changedTaskIds: string[]) {
    const queue = [...new Set(changedTaskIds)];
    const visited = new Set<string>();

    while (queue.length) {
      const changedTaskId = queue.shift()!;
      if (visited.has(changedTaskId)) continue;
      visited.add(changedTaskId);

      const outgoingDeps = await tx.taskDependency.findMany({ where: { predecessorTaskId: changedTaskId }, include: { successor: true } });
      for (const dep of outgoingDeps) {
        const successor = dep.successor;
        const employee = await tx.employeeProfile.findUniqueOrThrow({ where: { employeeId: successor.employeeId }, include: { absences: true } });
        const allDeps = await tx.taskDependency.findMany({ where: { successorTaskId: successor.id }, include: { predecessor: true } });
        const baseStart = this.scheduling.getNextWorkingDay(successor.earliestStartDate, successor.workLocationCountryCode || employee.workLocationCountryCode, successor.workLocationSubdivisionCode || employee.workLocationSubdivisionCode || undefined, employee.absences);
        const dependencyStart = this.computeDependencyMinimumStart(
          baseStart,
          allDeps.map((item: any) => ({ predecessorTaskId: item.predecessorTaskId, type: item.type as DependencyType, offsetDays: item.offsetDays, predecessor: item.predecessor })),
          successor.workLocationCountryCode || employee.workLocationCountryCode,
          successor.workLocationSubdivisionCode || employee.workLocationSubdivisionCode || undefined,
          employee.absences
        );
        const employeeTasks = await tx.workPackage.findMany({ where: { employeeId: successor.employeeId, NOT: { id: successor.id } } });
        const scheduled = this.scheduling.findEarliestFeasibleStart(
          dependencyStart,
          employeeTasks,
          successor.durationDays,
          successor.workLocationCountryCode || employee.workLocationCountryCode,
          successor.workLocationSubdivisionCode || employee.workLocationSubdivisionCode || undefined,
          employee.absences
        );
        if (scheduled.start.getTime() !== successor.scheduledStartDate.getTime() || scheduled.endExclusive.getTime() !== successor.scheduledEndDateExclusive.getTime()) {
          await tx.workPackage.update({ where: { id: successor.id }, data: { scheduledStartDate: scheduled.start, scheduledEndDateExclusive: scheduled.endExclusive } });
          await tx.schedulingEvent.create({ data: { workPackageId: successor.id, eventType: 'DEPENDENCY_RESCHEDULED', payloadJson: { sourceTaskId: changedTaskId, scheduled } as any } });
          queue.push(successor.id);
        }
      }
    }
  }

  async create(data: any) {
    const normalizedDependencies = this.normalizeDependencies(data.dependencies);
    const normalizedDates = {
      earliestStartDate: this.normalizeDateInput((data as any).earliestStartDate),
      deadlineDate: this.normalizeDateInput((data as any).deadlineDate)
    };
    const payload = { ...data, ...normalizedDates };
    const validation = await this.validate({ ...payload, dependencies: normalizedDependencies } as any);
    if (validation.collisions.length && payload.priority !== Priority.MAXIMUM && payload.resolution !== 'delay-new-task') {
      throw new DomainError('TASK_COLLISION', {
        message: 'La persona asignada ya tiene otro paquete de trabajo en ese periodo.',
        conflicts: validation.collisions.map((c) => ({ taskId: c.id, title: c.title, overlap: [validation.scheduled.start, validation.scheduled.endExclusive] }))
      });
    }
    return this.prisma.$transaction(async (tx: any) => {
      const { dependencies, resolution, ...taskData } = payload as any;
      const created = await tx.workPackage.create({ data: { ...taskData, scheduledStartDate: validation.scheduled.start, scheduledEndDateExclusive: validation.scheduled.endExclusive } });
      await this.syncDependencies(tx, created.id, normalizedDependencies);
      await tx.schedulingEvent.create({ data: { workPackageId: created.id, eventType: validation.deadlineRisk ? 'DEADLINE_RISK' : 'SCHEDULED', payloadJson: validation as any } });
      const impactedTaskIds = [created.id];
      if (created.priority === Priority.MAXIMUM) {
        const employeeTasks = await tx.workPackage.findMany({ where: { employeeId: created.employeeId } });
        const employee = await tx.employeeProfile.findUniqueOrThrow({ where: { employeeId: created.employeeId }, include: { absences: true } });
        const updates = this.scheduling.cascadeReschedule(created, employeeTasks, validation.locationCountry, validation.locationSubdivision, employee.absences);
        for (const u of updates) {
          await tx.workPackage.update({ where: { id: u.id }, data: { scheduledStartDate: u.start, scheduledEndDateExclusive: u.endExclusive } });
          await tx.schedulingEvent.create({ data: { workPackageId: u.id, eventType: 'CASCADE_POSTPONED', payloadJson: u as any } });
          impactedTaskIds.push(u.id);
        }
      }
      await this.rescheduleDependentChain(tx, impactedTaskIds);
      return created;
    });
  }

  async update(id: string, data: any) {
    const current = await this.prisma.workPackage.findUniqueOrThrow({ where: { id } });
    const normalizedDependencies = data.dependencies ? this.normalizeDependencies(data.dependencies) : undefined;
    const normalizedData = {
      ...data,
      ...(data.earliestStartDate ? { earliestStartDate: this.normalizeDateInput(data.earliestStartDate) } : {}),
      ...(data.deadlineDate ? { deadlineDate: this.normalizeDateInput(data.deadlineDate) } : {})
    };
    const merged = { ...current, ...normalizedData, ...(normalizedDependencies ? { dependencies: normalizedDependencies } : {}) };
    const validation = await this.validate(merged, id);
    if (validation.collisions.length && normalizedData.resolution !== 'delay-new-task' && merged.priority !== Priority.MAXIMUM) {
      throw new DomainError('EMPLOYEE_OVERBOOKED', {
        message: 'La persona asignada ya tiene otro paquete de trabajo en ese periodo.',
        conflicts: validation.collisions.map((c) => ({ id: c.id, title: c.title }))
      });
    }
    return this.prisma.$transaction(async (tx: any) => {
      const { dependencies, resolution, ...taskData } = normalizedData as any;
      const updated = await tx.workPackage.update({ where: { id }, data: { ...taskData, scheduledStartDate: validation.scheduled.start, scheduledEndDateExclusive: validation.scheduled.endExclusive } });
      await this.syncDependencies(tx, id, normalizedDependencies);
      await tx.schedulingEvent.create({ data: { workPackageId: id, eventType: 'TASK_UPDATED', payloadJson: validation as any } });
      await this.rescheduleDependentChain(tx, [id]);
      return updated;
    });
  }

  remove(id: string) { return this.prisma.$transaction(async (tx: any) => {
    await tx.taskDependency.deleteMany({ where: { OR: [{ predecessorTaskId: id }, { successorTaskId: id }] } });
    return tx.workPackage.delete({ where: { id } });
  }); }

  async reschedule(id: string) {
    const task = await this.prisma.workPackage.findUniqueOrThrow({ where: { id } });
    return this.update(id, { earliestStartDate: task.scheduledStartDate });
  }
}
