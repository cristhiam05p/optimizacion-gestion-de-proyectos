import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { z } from 'zod';

const TaskSchema = z.object({
  departmentId: z.string(),
  employeeId: z.string(),
  title: z.string().min(2),
  description: z.string(),
  earliestStartDate: z.union([z.string(), z.date()]),
  deadlineDate: z.union([z.string(), z.date()]),
  durationDays: z.number().int().min(1),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'MAXIMUM']),
  projectId: z.string(),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'DONE', 'BLOCKED']).default('PLANNED'),
  workLocationCountryCode: z.string().optional(),
  workLocationSubdivisionCode: z.string().optional(),
  resolution: z.string().optional()
});

@Controller('tasks')
export class TasksController {
  constructor(private service: TasksService) {}
  @Get() getAll() { return this.service.list(); }
  @Get(':id') getOne(@Param('id') id: string) { return this.service.get(id); }
  @Post() create(@Body() body: unknown) { return this.service.create(TaskSchema.parse(body) as any); }
  @Patch(':id') update(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
  @Post('validate') validate(@Body() body: any) { return this.service.validate(body); }
  @Post(':id/reschedule') reschedule(@Param('id') id: string) { return this.service.reschedule(id); }
}
