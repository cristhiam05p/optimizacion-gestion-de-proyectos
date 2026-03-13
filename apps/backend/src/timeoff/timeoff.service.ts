import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class TimeOffService {
  constructor(private prisma: PrismaService) {}
  list() { return this.prisma.employeeAbsence.findMany(); }
  create(data: any) { return this.prisma.employeeAbsence.create({ data }); }
  update(id: string, data: any) { return this.prisma.employeeAbsence.update({ where: { id }, data }); }
  remove(id: string) { return this.prisma.employeeAbsence.delete({ where: { id } }); }
}
