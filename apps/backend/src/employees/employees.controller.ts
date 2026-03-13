import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { EmployeesService } from './employees.service';
@Controller('employees')
export class EmployeesController {
  constructor(private service: EmployeesService) {}
  @Get() getAll() { return this.service.list(); }
  @Get(':id') getOne(@Param('id') id: string) { return this.service.get(id); }
  @Post() create(@Body() body: any) { return this.service.create(body); }
  @Patch(':id') update(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
  @Get(':id/timeline-metrics') metrics(@Param('id') id: string, @Query('start') start: string, @Query('days') days = '84') { return this.service.timelineMetrics(id, start, Number(days)); }
}
