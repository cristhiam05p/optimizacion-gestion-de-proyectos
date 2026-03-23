import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SchedulingService } from '../scheduling/scheduling.service';
import { addDays } from 'date-fns';
@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService, private scheduling: SchedulingService) {}
  list() { return this.prisma.employeeProfile.findMany({ include: { department: true } }); }
  get(id: string) { return this.prisma.employeeProfile.findUnique({ where: { employeeId: id }, include: { absences: true, workPackages: true, department: true } }); }
  create(data: any) { return this.prisma.employeeProfile.create({ data }); }
  update(id: string, data: any) { return this.prisma.employeeProfile.update({ where: { employeeId: id }, data }); }
  remove(id: string) { return this.prisma.employeeProfile.delete({ where: { employeeId: id } }); }
  async timelineMetrics(id: string, start: string, days: number) {
    const startDate = new Date(start);
    const endDate = addDays(startDate, days);
    const employee = await this.prisma.employeeProfile.findUniqueOrThrow({ where: { employeeId: id }, include: { workPackages: { where: { scheduledStartDate: { lt: endDate }, scheduledEndDateExclusive: { gt: startDate } } }, absences: true, department: true } });
    return {
      employee,
      visibleHours: this.scheduling.computeVisibleHours(employee.workPackages as any, startDate, days),
      weeklyOverload: this.scheduling.computeWeeklyOverload(employee.workPackages as any, employee.weeklyCapacityHours),
      totalVisibleTasks: employee.workPackages.length,
      totalVisiblePlannedDays: employee.workPackages.reduce((a: number, b: any) => a + b.durationDays, 0)
    };
  }
}
