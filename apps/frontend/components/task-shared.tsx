'use client';

import { addDays, format, isWeekend, parseISO, startOfDay, subDays } from 'date-fns';
import React from 'react';

export type DependencyEditorAction = {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
};

export function toISODate(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

export function nextWorkingDay(date: Date) {
  const current = startOfDay(date);
  while (isWeekend(current)) current.setDate(current.getDate() + 1);
  return current;
}

export function addWorkingDaysFrom(startDateISO: string, durationDays: number) {
  const start = nextWorkingDay(parseISO(startDateISO));
  const safeDuration = Math.max(1, Number(durationDays) || 1);

  let remaining = safeDuration - 1;
  const end = new Date(start);
  while (remaining > 0) {
    end.setDate(end.getDate() + 1);
    if (!isWeekend(end)) remaining -= 1;
  }
  return toISODate(end);
}

export function countWorkingDaysInclusive(startDateISO: string, endDateISO: string) {
  const start = nextWorkingDay(parseISO(startDateISO));
  const end = parseISO(endDateISO);
  if (end < start) return 1;
  let workingDays = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    if (!isWeekend(cursor)) workingDays += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return Math.max(1, workingDays);
}

export function formatDependencyType(type: string) {
  return ({ FS: 'Fin → Inicio', SS: 'Inicio → Inicio', FF: 'Fin → Fin', SF: 'Inicio → Fin' } as Record<string, string>)[type] || type;
}

export function describeDependency(dep: any) {
  const offset = Number(dep.offsetDays || 0);
  const offsetLabel = offset === 0 ? 'sin desfase' : offset > 0 ? `+${offset} día(s)` : `${offset} día(s)`;
  return `${formatDependencyType(dep.type)} · ${offsetLabel}`;
}

export function buildTaskModalPayload(task: any, getTaskEndDate: (task: any) => string) {
  return {
    departmentId: task.departmentId,
    employeeId: task.employeeId,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    earliestStartDate: String(task.earliestStartDate || task.scheduledStartDate).slice(0, 10),
    deadlineDate: String(task.deadlineDate || getTaskEndDate(task)).slice(0, 10),
    durationDays: task.durationDays,
    priority: task.priority,
    status: task.status,
    dependencies: (task.predecessorDeps || []).map((dep: any) => ({ predecessorTaskId: dep.predecessorTaskId, dependencyType: dep.type, offsetDays: dep.offsetDays || 0 }))
  };
}

export function getTaskDateRange(task: any) {
  return {
    start: String(task.scheduledStartDate || task.earliestStartDate || '').slice(0, 10),
    end: task.scheduledEndDateExclusive ? format(subDays(parseISO(String(task.scheduledEndDateExclusive).slice(0, 10)), 1), 'yyyy-MM-dd') : String(task.deadlineDate || '').slice(0, 10)
  };
}

export function Modal({ title, children, onClose }: any) {
  return <div onClick={onClose} className="fixed inset-0 z-[120] bg-slate-900/55 backdrop-blur-[2px] px-4 py-6 md:px-6 md:py-10 flex items-center justify-center">
    <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-blue-900/15 md:p-7">
      <div className="mb-5 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
        <button aria-label="Close modal" onClick={onClose} className="rounded-full border border-slate-200 px-3 py-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700">✕</button>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  </div>;
}

function DependencySection({ title, emptyText, items, actionsById }: { title: string; emptyText: string; items: any[]; actionsById?: Record<string, DependencyEditorAction[]> }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm text-slate-700">
    <p className="mb-2 font-semibold text-slate-800">{title}</p>
    {items.length ? <div className="space-y-2">{items.map((item) => <div key={item.key} className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-slate-800">{item.title}</p>
          <p className="text-slate-600">{item.subtitle}</p>
          <p className="text-xs text-slate-500">{item.meta}</p>
        </div>
        {!!actionsById?.[item.key]?.length && <div className="flex flex-wrap gap-2">{actionsById[item.key].map((action, index) => <button key={`${item.key}-${index}`} type="button" onClick={action.onClick} className={`rounded-md border px-2.5 py-1 text-xs font-medium ${action.variant === 'danger' ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-slate-200 text-slate-700 hover:bg-slate-100'}`}>{action.label}</button>)}</div>}
      </div>
    </div>)}</div> : <p>{emptyText}</p>}
  </div>;
}

export function TaskDetailModal({
  task,
  onClose,
  formError,
  showTaskOptions,
  setShowTaskOptions,
  onEdit,
  onDelete,
  getTaskStartDate,
  getTaskEndDate,
  incomingDependencyActions,
  outgoingDependencyActions
}: any) {
  const predecessors = (task.predecessorDeps || []).map((dep: any) => ({
    key: dep.id,
    title: dep.predecessor?.title || 'Paquete sin título',
    subtitle: `Este paquete depende de ${dep.predecessor?.title || 'otro paquete'}`,
    meta: describeDependency(dep)
  }));

  const successors = (task.successorDeps || []).map((dep: any) => ({
    key: dep.id,
    title: dep.successor?.title || 'Paquete sin título',
    subtitle: `${dep.successor?.title || 'Otro paquete'} depende de este paquete`,
    meta: describeDependency(dep)
  }));

  return <Modal onClose={onClose} title={task.title}>
    {formError && <p className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>}
    <div className="relative flex justify-end">
      <button type="button" className="rounded-md border border-slate-200 px-2 py-1" onClick={() => setShowTaskOptions((v: boolean) => !v)} aria-label="Opciones">⋯</button>
      {showTaskOptions && <div className="absolute top-10 w-40 rounded-lg border border-slate-200 bg-white p-1 shadow-md">
        <button type="button" className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-slate-100" onClick={onEdit}>Editar</button>
        <button type="button" className="block w-full rounded px-2 py-1 text-left text-sm text-red-600 hover:bg-red-50" onClick={onDelete}>Eliminar</button>
      </div>}
    </div>
    <div className="flex items-center gap-2">
      <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: task.project?.colorHex || '#334155' }} />
      <p className="text-slate-700">Proyecto: {task.project?.projectName}</p>
    </div>
    <p className="text-slate-700">Descripción: {task.description}</p>
    <p className="text-slate-700">Prioridad: {task.priority}</p>
    <DependencySection title="Este paquete depende de" emptyText="Sin dependencias configuradas." items={predecessors} actionsById={incomingDependencyActions} />
    <DependencySection title="Paquetes que dependen de este" emptyText="Ningún paquete depende de este elemento." items={successors} actionsById={outgoingDependencyActions} />
    <div className="grid gap-3 md:grid-cols-[1fr_260px] md:items-end">
      <div className="space-y-3">
        <p className="text-slate-700">Duración: {task.durationDays} día(s)</p>
        <p className="text-slate-700">Inicio: {getTaskStartDate(task)}</p>
        <p className="text-slate-700">Fin: {getTaskEndDate(task)}</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3" aria-label="Línea de tiempo">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Línea de tiempo</p>
        <div className="relative mt-4 h-8">
          <div className="absolute top-1/2 h-[2px] w-full -translate-y-1/2 rounded-full bg-slate-300" />
          <div className="absolute left-0 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-blue-700 bg-white" />
          <div className="absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-blue-700 bg-white" />
          <div className="absolute left-0 top-1/2 h-2 w-full -translate-y-1/2 rounded-full bg-blue-700/85" />
        </div>
        <div className="mt-2 flex items-start justify-between text-[11px] text-slate-600">
          <div>
            <p className="font-semibold text-slate-700">Desde</p>
            <p>{getTaskStartDate(task)}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-slate-700">Hasta</p>
            <p>{getTaskEndDate(task)}</p>
          </div>
        </div>
      </div>
    </div>
  </Modal>;
}
