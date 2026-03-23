'use client';

import { useMemo, useState } from 'react';
import { addDays, differenceInCalendarDays, eachDayOfInterval, format, isAfter, parseISO } from 'date-fns';
import { TaskDetailModal, addWorkingDaysFrom } from './task-shared';

type Props = {
  projects: any[];
  employees: any[];
  departments: any[];
  tasks: any[];
  onUpdateTask: (taskId: string, data: any) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
};

const DAY_WIDTH = 28;
const ROW_HEIGHT = 44;
const PROJECT_COLOR_FALLBACKS = ['#2563eb', '#7c3aed', '#0f766e', '#dc2626', '#ea580c', '#0891b2', '#65a30d'];

function toDate(value: string | Date) {
  return typeof value === 'string' ? parseISO(String(value).slice(0, 10)) : value;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '');
  const safe = normalized.length === 3 ? normalized.split('').map((part) => part + part).join('') : normalized;
  const value = Number.parseInt(safe, 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

function mix(hex: string, amount: number, target: number) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(
    Math.round(r + (target - r) * amount),
    Math.round(g + (target - g) * amount),
    Math.round(b + (target - b) * amount)
  );
}

function getProjectBaseColor(project: any, index: number) {
  return project.colorHex || PROJECT_COLOR_FALLBACKS[index % PROJECT_COLOR_FALLBACKS.length];
}

function getTaskBarColor(baseColor: string, taskIndex: number) {
  const cycle = taskIndex % 3;
  if (cycle === 1) return mix(baseColor, 0.12, 255);
  if (cycle === 2) return mix(baseColor, 0.12, 0);
  return baseColor;
}

export function ActiveProjectsOverview({ projects, employees, departments, tasks, onUpdateTask, onDeleteTask }: Props) {
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [expandedProjectIds, setExpandedProjectIds] = useState<string[]>(projects.map((project) => project.id));
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showTaskOptions, setShowTaskOptions] = useState(false);
  const [formError, setFormError] = useState('');
  const taskMap = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);

  const filteredProjects = useMemo(() => projects.filter((project) => {
    if (projectFilter !== 'all' && project.id !== projectFilter) return false;
    if (statusFilter !== 'all' && project.status !== statusFilter) return false;
    const filteredPackages = project.workPackages.filter((wp: any) => {
      if (departmentFilter !== 'all' && wp.departmentId !== departmentFilter) return false;
      if (employeeFilter !== 'all' && wp.employeeId !== employeeFilter) return false;
      return true;
    });
    return filteredPackages.length > 0;
  }), [projects, projectFilter, statusFilter, departmentFilter, employeeFilter]);

  const getTaskStartDate = (task: any) => String(task.scheduledStartDate || task.earliestStartDate || '').slice(0, 10);
  const getTaskEndDate = (task: any) => {
    const startDate = getTaskStartDate(task);
    if (startDate) return addWorkingDaysFrom(startDate, Number(task.durationDays) || 1);
    return String(task.deadlineDate || '').slice(0, 10);
  };

  const openTask = (taskId: string) => {
    const task = taskMap.get(taskId);
    if (!task) return;
    setSelectedTask(task);
    setShowTaskOptions(false);
  };

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Proyectos Activos</h2>
          <p className="mt-1 text-sm text-slate-600">Vista general de proyectos activos con paquetes de trabajo, dependencias y alertas de planificación.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-3">
            <Legend color="bg-slate-200" label="Marco del proyecto" />
            <Legend color="bg-amber-500" label="Con retraso estimado" />
            <Legend color="bg-emerald-500" label="Dependencia resaltada" />
            <Legend color="bg-slate-900" label="Color estable por proyecto" />
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <select className="rounded-xl border border-slate-200 p-3" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
          <option value="all">Todos los proyectos</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.projectName}</option>)}
        </select>
        <select className="rounded-xl border border-slate-200 p-3" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">Todos los estados</option>
          <option value="ACTIVE">Activos</option>
          <option value="PLANNED">Planificados</option>
          <option value="ON_HOLD">En pausa</option>
          <option value="COMPLETED">Completados</option>
        </select>
        <select className="rounded-xl border border-slate-200 p-3" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
          <option value="all">Todos los departamentos</option>
          {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
        </select>
        <select className="rounded-xl border border-slate-200 p-3" value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)}>
          <option value="all">Todos los empleados</option>
          {employees.map((employee) => <option key={employee.employeeId} value={employee.employeeId}>{employee.employeeName}</option>)}
        </select>
      </div>

      {!filteredProjects.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">No hay proyectos activos que coincidan con los filtros seleccionados.</div>}

      <div className="space-y-4">
        {filteredProjects.map((project, projectIndex) => {
          const isExpanded = expandedProjectIds.includes(project.id);
          const projectStart = toDate(project.startDate);
          const projectEnd = toDate(project.estimatedEndDate);
          const projectDays = eachDayOfInterval({ start: projectStart, end: projectEnd });
          const baseColor = getProjectBaseColor(project, projectIndex);
          const visiblePackages = project.workPackages.filter((wp: any) => {
            if (departmentFilter !== 'all' && wp.departmentId !== departmentFilter) return false;
            if (employeeFilter !== 'all' && wp.employeeId !== employeeFilter) return false;
            return true;
          });

          return (
            <article key={project.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setExpandedProjectIds((current) => current.includes(project.id) ? current.filter((id) => id !== project.id) : [...current, project.id])}
                className="flex w-full flex-wrap items-center justify-between gap-3 bg-white px-4 py-4 text-left"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: baseColor }} />
                    <h3 className="text-lg font-semibold text-slate-900">{project.projectName}</h3>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{project.status}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{project.clientName} · {format(projectStart, 'yyyy-MM-dd')} → {format(projectEnd, 'yyyy-MM-dd')} · {visiblePackages.length} paquetes visibles</p>
                </div>
                <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">{isExpanded ? 'Ocultar Gantt' : 'Ver Gantt'}</span>
              </button>

              {isExpanded && (
                <div className="space-y-4 border-t border-slate-200 px-4 py-4">
                  <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">Leyenda del proyecto:</span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-2 py-1"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: baseColor }} />Base</span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-2 py-1"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: getTaskBarColor(baseColor, 1) }} />Variante clara</span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-2 py-1"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: getTaskBarColor(baseColor, 2) }} />Variante oscura</span>
                  </div>
                  <div className="overflow-x-auto">
                    <div style={{ minWidth: 360 + projectDays.length * DAY_WIDTH }}>
                      <div className="grid border-b border-slate-200 bg-white" style={{ gridTemplateColumns: `320px repeat(${projectDays.length}, ${DAY_WIDTH}px)` }}>
                        <div className="sticky left-0 z-10 border-r border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Paquete / Responsable</div>
                        {projectDays.map((day) => (
                          <div key={day.toISOString()} className="border-r border-slate-100 px-1 py-2 text-center text-[10px] text-slate-500">{format(day, 'dd/MM')}</div>
                        ))}
                      </div>

                      <div className="relative bg-white">
                        <svg width={320 + projectDays.length * DAY_WIDTH} height={visiblePackages.length * ROW_HEIGHT} className="pointer-events-none absolute left-0 top-0 z-10 overflow-visible">
                          {visiblePackages.flatMap((task: any, rowIndex: number) =>
                            (task.predecessorDeps || []).map((dep: any) => {
                              const predecessorIndex = visiblePackages.findIndex((candidate: any) => candidate.id === dep.predecessorTaskId);
                              if (predecessorIndex === -1) return null;
                              const predecessor = dep.predecessor;
                              const predEnd = toDate(addDays(toDate(predecessor.scheduledEndDateExclusive), -1));
                              const successorStart = toDate(task.scheduledStartDate);
                              const x1 = 320 + (differenceInCalendarDays(predEnd, projectStart) + 1) * DAY_WIDTH;
                              const x2 = 320 + differenceInCalendarDays(successorStart, projectStart) * DAY_WIDTH;
                              const y1 = predecessorIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
                              const y2 = rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
                              const active = hoveredTaskId === task.id || hoveredTaskId === predecessor.id;
                              return (
                                <g key={dep.id} opacity={active || !hoveredTaskId ? 1 : 0.18}>
                                  <path d={`M ${x1} ${y1} H ${x1 + 12} V ${y2} H ${x2 - 6}`} fill="none" stroke={active ? '#10b981' : '#94a3b8'} strokeWidth="2" />
                                  <path d={`M ${x2 - 6} ${y2} L ${x2 - 12} ${y2 - 4} L ${x2 - 12} ${y2 + 4} Z`} fill={active ? '#10b981' : '#94a3b8'} />
                                </g>
                              );
                            })
                          )}
                        </svg>

                        {visiblePackages.map((task: any, index: number) => {
                          const start = toDate(task.scheduledStartDate);
                          const end = toDate(addDays(toDate(task.scheduledEndDateExclusive), -1));
                          const left = clamp(differenceInCalendarDays(start, projectStart), 0, Math.max(projectDays.length - 1, 0)) * DAY_WIDTH;
                          const span = Math.max(1, differenceInCalendarDays(end, start) + 1) * DAY_WIDTH;
                          const late = isAfter(end, projectEnd);
                          const taskColor = late ? '#f59e0b' : getTaskBarColor(baseColor, index);
                          return (
                            <div key={task.id} className="grid border-b border-slate-100 last:border-b-0" style={{ gridTemplateColumns: `320px repeat(${projectDays.length}, ${DAY_WIDTH}px)`, minHeight: ROW_HEIGHT }}>
                              <div className="sticky left-0 z-20 flex items-center gap-2 border-r border-slate-200 bg-white px-3 py-2">
                                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: taskColor }} />
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-slate-800">{task.title}</p>
                                  <p className="truncate text-xs text-slate-500">{task.employee?.employeeName || 'Sin asignar'} · {task.department?.name || 'Sin departamento'}</p>
                                </div>
                              </div>
                              <div className="relative col-span-full -ml-[1px]" style={{ gridColumn: `2 / span ${projectDays.length}` }}>
                                <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${projectDays.length}, ${DAY_WIDTH}px)` }}>
                                  {projectDays.map((day) => <div key={`${task.id}-${day.toISOString()}`} className="border-r border-slate-100" />)}
                                </div>
                                <button
                                  type="button"
                                  onMouseEnter={() => setHoveredTaskId(task.id)}
                                  onMouseLeave={() => setHoveredTaskId(null)}
                                  onClick={() => openTask(task.id)}
                                  className="absolute top-1/2 z-20 h-7 -translate-y-1/2 rounded-full px-3 text-left text-xs font-medium text-white shadow-sm"
                                  style={{ left, width: span, backgroundColor: taskColor }}
                                  title={(task.predecessorDeps || []).map((dep: any) => `Depende de: ${dep.predecessor.title} · Regla: ${dep.type} ${dep.offsetDays ? `(${dep.offsetDays}d)` : ''}`).join('\n') || 'Sin dependencias'}
                                >
                                  <span className="block truncate">{task.title}</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {selectedTask && <TaskDetailModal
        task={selectedTask}
        onClose={() => { setSelectedTask(null); setShowTaskOptions(false); }}
        formError={formError}
        showTaskOptions={showTaskOptions}
        setShowTaskOptions={setShowTaskOptions}
        onEdit={() => { setShowTaskOptions(false); }}
        onDelete={async () => {
          try {
            await onDeleteTask(selectedTask.id);
            setSelectedTask(null);
          } catch (error: any) {
            setFormError(error?.message || 'No se pudo eliminar el paquete.');
          }
        }}
        getTaskStartDate={getTaskStartDate}
        getTaskEndDate={getTaskEndDate}
        incomingDependencyActions={Object.fromEntries((selectedTask.predecessorDeps || []).map((dep: any) => [dep.id, [
          { label: 'Editar dependencias', onClick: () => setShowTaskOptions(true) },
          { label: 'Eliminar', variant: 'danger', onClick: async () => {
            try {
              const dependencies = (selectedTask.predecessorDeps || []).filter((item: any) => item.id !== dep.id).map((item: any) => ({ predecessorTaskId: item.predecessorTaskId, dependencyType: item.type, offsetDays: item.offsetDays || 0 }));
              await onUpdateTask(selectedTask.id, { dependencies });
              setSelectedTask((current: any) => current ? { ...current, predecessorDeps: (current.predecessorDeps || []).filter((item: any) => item.id !== dep.id) } : current);
            } catch (error: any) {
              setFormError(error?.message || 'No se pudo eliminar la dependencia.');
            }
          } }
        ]]))}
        outgoingDependencyActions={Object.fromEntries((selectedTask.successorDeps || []).map((dep: any) => [dep.id, [
          { label: 'Editar dependiente', onClick: () => openTask(dep.successorTaskId) },
          { label: 'Eliminar', variant: 'danger', onClick: async () => {
            try {
              const successor = taskMap.get(dep.successorTaskId);
              if (!successor) return;
              const dependencies = (successor.predecessorDeps || []).filter((item: any) => item.id !== dep.id).map((item: any) => ({ predecessorTaskId: item.predecessorTaskId, dependencyType: item.type, offsetDays: item.offsetDays || 0 }));
              await onUpdateTask(dep.successorTaskId, { dependencies });
              setSelectedTask((current: any) => current ? { ...current, successorDeps: (current.successorDeps || []).filter((item: any) => item.id !== dep.id) } : current);
            } catch (error: any) {
              setFormError(error?.message || 'No se pudo eliminar la dependencia.');
            }
          } }
        ]]))}
      />}
    </section>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-2"><span className={`h-3 w-3 rounded-full ${color}`} />{label}</span>;
}
