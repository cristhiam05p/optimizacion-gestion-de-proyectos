import { Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { DepartmentsController } from './departments/departments.controller';
import { DepartmentsService } from './departments/departments.service';
import { EmployeesController } from './employees/employees.controller';
import { EmployeesService } from './employees/employees.service';
import { TimeOffController } from './timeoff/timeoff.controller';
import { TimeOffService } from './timeoff/timeoff.service';
import { ProjectsController } from './projects/projects.controller';
import { ProjectsService } from './projects/projects.service';
import { TasksController } from './tasks/tasks.controller';
import { TasksService } from './tasks/tasks.service';
import { SchedulingService } from './scheduling/scheduling.service';
import { ScheduleController } from './schedule/schedule.controller';

@Module({
  controllers: [DepartmentsController, EmployeesController, TimeOffController, ProjectsController, TasksController, ScheduleController],
  providers: [PrismaService, DepartmentsService, EmployeesService, TimeOffService, ProjectsService, TasksService, SchedulingService]
})
export class AppModule {}
