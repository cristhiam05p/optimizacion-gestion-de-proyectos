import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}
  list() { return this.prisma.department.findMany(); }
  create(data: {name: string; code: string}) { return this.prisma.department.create({ data }); }
  update(id: string, data: Partial<{name: string; code: string}>) { return this.prisma.department.update({ where: { id }, data }); }
  remove(id: string) { return this.prisma.department.delete({ where: { id } }); }
}
