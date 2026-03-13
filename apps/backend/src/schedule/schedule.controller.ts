import { Controller, Get, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TasksService } from '../tasks/tasks.service';
@Controller('schedule')
export class ScheduleController {
  constructor(private prisma: PrismaService, private tasks: TasksService) {}
  @Post('rebuild') async rebuild() {
    const tasks = await this.prisma.workPackage.findMany();
    for (const t of tasks) await this.tasks.reschedule(t.id);
    return { ok: true };
  }
  @Get('conflicts') async conflicts() {
    const all = await this.prisma.workPackage.findMany();
    const conflicts: any[] = [];
    for (const a of all) for (const b of all) {
      if (a.id >= b.id || a.employeeId !== b.employeeId) continue;
      if (a.scheduledStartDate < b.scheduledEndDateExclusive && a.scheduledEndDateExclusive > b.scheduledStartDate) conflicts.push({ a: a.id, b: b.id, code: 'TASK_COLLISION' });
    }
    return conflicts;
  }
  @Get('audit-log') audit() { return this.prisma.schedulingEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 300 }); }
}
