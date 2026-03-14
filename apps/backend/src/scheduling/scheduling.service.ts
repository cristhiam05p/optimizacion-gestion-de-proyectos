import { Injectable } from '@nestjs/common';
import { EmployeeAbsence, Priority, WorkPackage } from '@prisma/client';
import { addDays, differenceInCalendarDays, format, isAfter, isBefore, isEqual, isWeekend, startOfDay } from 'date-fns';

const Holidays = require('date-holidays');

@Injectable()
export class SchedulingService {
  private hd = new Holidays();

  isWorkingDay(date: Date, countryCode: string, subdivisionCode?: string, absences: EmployeeAbsence[] = []) {
    if (isWeekend(date)) return false;
    const country = countryCode || 'DE';
    try {
      if (subdivisionCode) this.hd.init(country, subdivisionCode);
      else this.hd.init(country);
    } catch {
      this.hd.init(country);
    }
    if (this.hd.isHoliday(date)) return false;
    return !absences.some((a) => !isBefore(date, startOfDay(a.startDate)) && !isAfter(date, startOfDay(a.endDate)));
  }

  getNextWorkingDay(date: Date, countryCode: string, subdivisionCode?: string, absences: EmployeeAbsence[] = []) {
    let current = startOfDay(date);
    while (!this.isWorkingDay(current, countryCode, subdivisionCode, absences)) current = addDays(current, 1);
    return current;
  }

  addWorkingDays(date: Date, days: number, countryCode: string, subdivisionCode?: string, absences: EmployeeAbsence[] = []) {
    let current = this.getNextWorkingDay(date, countryCode, subdivisionCode, absences);
    let remaining = days;
    while (remaining > 0) {
      current = addDays(current, 1);
      if (this.isWorkingDay(current, countryCode, subdivisionCode, absences)) remaining -= 1;
    }
    return current;
  }

  detectTaskCollisions(task: { employeeId: string; scheduledStartDate: Date; scheduledEndDateExclusive: Date; id?: string }, existing: WorkPackage[]) {
    return existing.filter((t) =>
      t.employeeId === task.employeeId && t.id !== task.id && task.scheduledStartDate < t.scheduledEndDateExclusive && task.scheduledEndDateExclusive > t.scheduledStartDate
    );
  }

  resolveDependencies(taskStart: Date, deps: { type: 'FS'|'SS'; predecessor: WorkPackage }[]) {
    return deps.reduce((acc, dep) => {
      if (dep.type === 'FS' && isBefore(acc, dep.predecessor.scheduledEndDateExclusive)) return dep.predecessor.scheduledEndDateExclusive;
      if (dep.type === 'SS' && isBefore(acc, dep.predecessor.scheduledStartDate)) return dep.predecessor.scheduledStartDate;
      return acc;
    }, taskStart);
  }

  findEarliestFeasibleStart(base: Date, employeeTasks: WorkPackage[], durationDays: number, country: string, subdivision: string|undefined, absences: EmployeeAbsence[]) {
    let start = this.getNextWorkingDay(base, country, subdivision, absences);
    while (true) {
      const end = this.addWorkingDays(start, durationDays - 1, country, subdivision, absences);
      const exclusive = addDays(end, 1);
      const collision = employeeTasks.find((t) => start < t.scheduledEndDateExclusive && exclusive > t.scheduledStartDate);
      if (!collision) return { start, endExclusive: exclusive };
      start = this.getNextWorkingDay(collision.scheduledEndDateExclusive, country, subdivision, absences);
    }
  }

  rescheduleTask(task: WorkPackage, start: Date, country: string, subdivision: string|undefined, absences: EmployeeAbsence[]) {
    const actualStart = this.getNextWorkingDay(start, country, subdivision, absences);
    const end = this.addWorkingDays(actualStart, task.durationDays - 1, country, subdivision, absences);
    return { scheduledStartDate: actualStart, scheduledEndDateExclusive: addDays(end, 1) };
  }

  cascadeReschedule(inserted: WorkPackage, employeeTasks: WorkPackage[], country: string, subdivision: string|undefined, absences: EmployeeAbsence[]) {
    const sorted = employeeTasks.sort((a,b) => a.scheduledStartDate.getTime() - b.scheduledStartDate.getTime());
    let cursor = inserted.scheduledEndDateExclusive;
    const updates: {id: string; start: Date; endExclusive: Date}[] = [];
    for (const t of sorted) {
      if (t.id === inserted.id) continue;
      if (t.priority === Priority.MAXIMUM && inserted.priority !== Priority.MAXIMUM) continue;
      if (t.scheduledStartDate < cursor) {
        const shifted = this.rescheduleTask(t, cursor, country, subdivision, absences);
        updates.push({ id: t.id, start: shifted.scheduledStartDate, endExclusive: shifted.scheduledEndDateExclusive });
        cursor = shifted.scheduledEndDateExclusive;
      } else {
        cursor = t.scheduledEndDateExclusive;
      }
    }
    return updates;
  }

  computeVisibleHours(tasks: WorkPackage[], start: Date, days: number) {
    const end = addDays(start, days);
    return tasks.reduce((acc, t) => {
      const overlapDays = Math.max(0, Math.min(differenceInCalendarDays(t.scheduledEndDateExclusive, start), days) - Math.max(differenceInCalendarDays(t.scheduledStartDate, start), 0));
      return acc + overlapDays * 8;
    }, 0);
  }

  computeWeeklyOverload(tasks: WorkPackage[], weeklyCapacityHours: number) {
    const map: Record<string, number> = {};
    for (const t of tasks) {
      const week = format(t.scheduledStartDate, "RRRR-'W'II");
      map[week] = (map[week] || 0) + t.durationDays * 8;
    }
    return Object.entries(map).map(([week, hours]) => ({ week, hours, overloaded: hours > weeklyCapacityHours }));
  }

  deadlineRisk(deadline: Date, endExclusive: Date) {
    return isAfter(endExclusive, addDays(deadline, 1)) || isEqual(endExclusive, addDays(deadline, 2));
  }
}
