import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { TimeOffService } from './timeoff.service';
@Controller('time-off')
export class TimeOffController {
  constructor(private service: TimeOffService) {}
  @Get() getAll() { return this.service.list(); }
  @Post() create(@Body() body: any) { return this.service.create(body); }
  @Patch(':id') update(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
