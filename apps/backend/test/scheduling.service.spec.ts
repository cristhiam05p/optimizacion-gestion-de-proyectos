import { SchedulingService } from '../src/scheduling/scheduling.service';
const Priority = { MAXIMUM: 'MAXIMUM', NORMAL: 'NORMAL' } as const;

describe('SchedulingService', () => {
  const service = new SchedulingService();
  const absences = [{ id: '1', employeeId: 'e1', startDate: new Date('2026-01-13'), endDate: new Date('2026-01-13'), reason: 'Off' }] as any;

  it('addWorkingDays skips weekends and holidays', () => {
    const result = service.addWorkingDays(new Date('2026-01-05'), 5, 'DE', 'BW', []);
    expect(result.getDay()).not.toBe(0);
    expect(result.getDay()).not.toBe(6);
  });

  it('findEarliestFeasibleStart keeps duration in working days only', () => {
    const scheduled = service.findEarliestFeasibleStart(new Date('2026-03-19'), [], 3, 'DE', 'BW', []);
    expect(scheduled.start.toISOString().slice(0, 10)).toBe('2026-03-19');
    expect(scheduled.endExclusive.toISOString().slice(0, 10)).toBe('2026-03-24');
  });

  it('detects collisions', () => {
    const col = service.detectTaskCollisions({ employeeId: 'e1', scheduledStartDate: new Date('2026-01-10'), scheduledEndDateExclusive: new Date('2026-01-13') }, [{ id: 'a', employeeId: 'e1', scheduledStartDate: new Date('2026-01-11'), scheduledEndDateExclusive: new Date('2026-01-12') } as any]);
    expect(col).toHaveLength(1);
  });

  it('absence conflict detection via working day', () => {
    expect(service.isWorkingDay(new Date('2026-01-13'), 'DE', 'BW', absences)).toBe(false);
  });

  it('dependency validation FS', () => {
    const resolved = service.resolveDependencies(new Date('2026-01-10'), [{ type: 'FS', predecessor: { scheduledEndDateExclusive: new Date('2026-01-15'), scheduledStartDate: new Date('2026-01-13') } as any }], 'DE');
    expect(resolved.toISOString().slice(0,10)).toBe('2026-01-15');
  });

  it('MAXIMUM priority cascading reschedule', () => {
    const inserted = { id: 'x', priority: Priority.MAXIMUM, scheduledStartDate: new Date('2026-01-10'), scheduledEndDateExclusive: new Date('2026-01-12') } as any;
    const updates = service.cascadeReschedule(inserted, [
      inserted,
      { id: 'a', priority: Priority.NORMAL, scheduledStartDate: new Date('2026-01-11'), scheduledEndDateExclusive: new Date('2026-01-14'), durationDays: 2 } as any
    ], 'DE', 'BW', []);
    expect(updates.length).toBe(1);
  });

  it('deadline risk handling', () => {
    expect(service.deadlineRisk(new Date('2026-01-12'), new Date('2026-01-15'))).toBe(true);
  });
});
