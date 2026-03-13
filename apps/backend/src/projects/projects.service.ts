import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}
  list() { return this.prisma.project.findMany(); }
  create(data: any) { return this.prisma.project.create({ data }); }
  update(id: string, data: any) { return this.prisma.project.update({ where: { id }, data }); }
  remove(id: string) { return this.prisma.project.delete({ where: { id } }); }
}
