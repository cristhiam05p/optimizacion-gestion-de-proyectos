'use client';
import { useMemo, useState } from 'react';
import { addDays, differenceInCalendarDays, eachDayOfInterval, format, getISOWeek, isWeekend, parseISO } from 'date-fns';
import { de, es } from 'date-fns/locale';
import { normalize } from '../lib/api';

type Props = { employees: any[]; departments: any[]; projects: any[]; tasks: any[]; startDate: string };

export function Timeline({ employees, departments, projects, tasks, startDate }: Props) {
  const [department, setDepartment] = useState('all');
  const [query, setQuery] = useState('');
  const [taskModal, setTaskModal] = useState<any>(null);
  const [employeeModal, setEmployeeModal] = useState<any>(null);
  const days = 84;
  const dayW = 42;
  const start = parseISO(startDate);
  const dates = eachDayOfInterval({ start, end: addDays(start, days - 1) });

  const filteredEmployees = useMemo(() => employees.filter((e) => {
    if (department !== 'all' && e.departmentId !== department) return false;
    if (!query) return true;
    const q = normalize(query);
    const ownTasks = tasks.filter((t) => t.employeeId === e.employeeId);
    const hay = normalize(`${e.employeeName} ${ownTasks.map((t: any) => `${t.title} ${t.description} ${t.project?.projectName || ''}`).join(' ')}`);
    return hay.includes(q);
  }), [department, employees, query, tasks]);

  const grouped = departments.map((d) => ({ ...d, employees: filteredEmployees.filter((e) => e.departmentId === d.id) })).filter((d) => d.employees.length);

  return <div className="p-4 space-y-4">
    <header><h1 className="text-2xl font-bold">Vista Recursos (MVP)</h1><p className="text-slate-600">Planificación inteligente por empleado con reglas de calendario laboral.</p></header>
    <div className="flex gap-2"><select className="border p-2" value={department} onChange={(e) => setDepartment(e.target.value)}><option value="all">Todos</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select><input className="border p-2 flex-1" placeholder="Buscar" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
    <div className="flex flex-wrap gap-2">{projects.map((p) => <span key={p.id} className="px-2 py-1 rounded text-white text-xs" style={{ background: p.colorHex }}>{p.projectName}</span>)}</div>

    <div className="overflow-auto border bg-white">
      <div className="sticky top-0 z-20 bg-white border-b">
        <div className="flex">
          <div className="sticky left-0 bg-white z-30 w-[220px] md:w-[220px] max-md:w-[160px] border-r" />
          <div className="flex">
            {Array.from(new Set(dates.map((d) => getISOWeek(d)))).map((week) => {
              const weekDays = dates.filter((d) => getISOWeek(d) === week);
              return <div key={week} style={{ width: weekDays.length * dayW }} className="border-r text-xs text-center">KW {week} {format(weekDays[0], 'dd MMM', { locale: de })}-{format(weekDays[weekDays.length-1], 'dd MMM', { locale: de })}</div>;
            })}
          </div>
        </div>
        <div className="flex">
          <div className="sticky left-0 z-30 bg-white w-[220px] md:w-[220px] max-md:w-[160px] border-r text-xs p-1">Departamento / Empleado</div>
          {dates.map((d) => <div key={d.toISOString()} style={{ width: dayW }} className={`text-center text-[10px] ${isWeekend(d) ? 'bg-blue-50' : ''}`}>{format(d, 'EE d', { locale: es })}</div>)}
        </div>
      </div>

      {grouped.map((dep) => <div key={dep.id}><div className="sticky left-0 bg-slate-100 p-2 font-semibold border-b">{dep.name}</div>
        {dep.employees.map((e: any) => <div key={e.employeeId} className="relative flex border-b h-[52px]">
          <button onClick={() => setEmployeeModal(e)} className="sticky left-0 z-10 bg-white border-r text-left px-2 w-[220px] md:w-[220px] max-md:w-[160px]">{e.employeeName}</button>
          <div className="relative flex">{dates.map((d) => <div key={d.toISOString()} style={{ width: dayW }} className={`${isWeekend(d) ? 'bg-blue-50' : ''} border-r`} />)}</div>
          {tasks.filter((t) => t.employeeId === e.employeeId).map((t: any) => {
            const left = differenceInCalendarDays(new Date(t.scheduledStartDate), start) * dayW;
            const width = Math.max(1, differenceInCalendarDays(new Date(t.scheduledEndDateExclusive), new Date(t.scheduledStartDate))) * dayW;
            return <button key={t.id} onClick={() => setTaskModal(t)} className="absolute top-2 h-8 rounded text-white text-xs px-2 text-left overflow-hidden" style={{ left: 220 + left, width, background: t.project?.colorHex || '#334155' }}>{t.title} · {t.project?.projectName}</button>;
          })}
        </div>)}
      </div>)}
    </div>

    {taskModal && <Modal onClose={() => setTaskModal(null)} title={taskModal.title}><p>Proyecto: {taskModal.project?.projectName}</p><p>Prioridad: {taskModal.priority}</p><p>Duración: {taskModal.durationDays} días</p><p>Inicio: {String(taskModal.scheduledStartDate).slice(0,10)}</p></Modal>}
    {employeeModal && <Modal onClose={() => setEmployeeModal(null)} title={employeeModal.employeeName}><p>Rol: {employeeModal.role}</p><p>Coste/h: {employeeModal.hourlyCost}</p><p>Capacidad semanal: {employeeModal.weeklyCapacityHours}h</p></Modal>}
  </div>;
}

function Modal({ title, children, onClose }: any) {
  return <div onClick={onClose} className="fixed inset-0 bg-black/50 flex items-center justify-center"><div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-lg max-md:max-w-none max-md:h-full p-4"><button aria-label="Close modal" onClick={onClose} className="float-right">✕</button><h2 className="text-lg font-bold">{title}</h2>{children}</div></div>;
}
