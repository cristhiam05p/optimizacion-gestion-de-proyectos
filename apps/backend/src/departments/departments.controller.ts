import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { IsString } from 'class-validator';
import { DepartmentsService } from './departments.service';
class DepartmentDto { @IsString() name!: string; @IsString() code!: string; }
@Controller('departments')
export class DepartmentsController {
  constructor(private service: DepartmentsService) {}
  @Get() getAll() { return this.service.list(); }
  @Post() create(@Body() body: DepartmentDto) { return this.service.create(body); }
  @Patch(':id') update(@Param('id') id: string, @Body() body: Partial<DepartmentDto>) { return this.service.update(id, body); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
