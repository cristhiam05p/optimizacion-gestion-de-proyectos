import { Injectable } from '@nestjs/common';
const ProjectStatus = { ACTIVE: 'ACTIVE' } as const;
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.project.findMany({
      orderBy: { startDate: 'asc' },
      include: {
        workPackages: {
          include: {
            employee: true,
            department: true,
            predecessorDeps: { include: { predecessor: true } },
            successorDeps: { include: { successor: true } }
          },
          orderBy: { scheduledStartDate: 'asc' }
        }
      }
    });
  }

  listActiveOverview() {
    return this.prisma.project.findMany({
      where: { status: ProjectStatus.ACTIVE },
      orderBy: { startDate: 'asc' },
      include: {
        workPackages: {
          include: {
            employee: true,
            department: true,
            predecessorDeps: { include: { predecessor: true } },
            successorDeps: { include: { successor: true } }
          },
          orderBy: { scheduledStartDate: 'asc' }
        }
      }
    });
  }

  create(data: any) { return this.prisma.project.create({ data }); }
  update(id: string, data: any) { return this.prisma.project.update({ where: { id }, data }); }
  remove(id: string) { return this.prisma.project.delete({ where: { id } }); }
}
