'use client';
import React from 'react';
import { FormEvent, useMemo, useState } from 'react';
import { addDays, differenceInCalendarDays, eachDayOfInterval, format, getISOWeek, isWeekend, parseISO } from 'date-fns';
import { de, es } from 'date-fns/locale';
import { normalize } from '../lib/api';

type Props = {
  employees: any[];
  departments: any[];
  projects: any[];
  tasks: any[];
  startDate: string;
  onCreateDepartment: (data: { name: string; code: string }) => Promise<void>;
  onCreateEmployee: (data: any) => Promise<void>;
  onCreateTask: (data: any) => Promise<void>;
};

export function Timeline({ employees, departments, projects, tasks, startDate, onCreateDepartment, onCreateEmployee, onCreateTask }: Props) {
  const [department, setDepartment] = useState('all');
  const [query, setQuery] = useState('');
  const [taskModal, setTaskModal] = useState<any>(null);
  const [employeeModal, setEmployeeModal] = useState<any>(null);
  const [rangeOffsetDays, setRangeOffsetDays] = useState(0);
  const [formError, setFormError] = useState('');

  const [newDepartment, setNewDepartment] = useState({ name: '', code: '' });
  const [newEmployee, setNewEmployee] = useState({
    employeeName: '', departmentId: '', role: '', hourlyCost: 20, weeklyCapacityHours: 40, workLocationCountryCode: 'CO', workLocationSubdivisionCode: ''
  });
  const [newTask, setNewTask] = useState({
    departmentId: '', employeeId: '', projectId: '', title: '', description: '',
    earliestStartDate: startDate, deadlineDate: addDays(parseISO(startDate), 7).toISOString().slice(0, 10), durationDays: 3,
    priority: 'NORMAL', status: 'PLANNED'
  });

  const days = 90;
  const dayW = 42;
  const start = addDays(parseISO(startDate), rangeOffsetDays);
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

  const submitDepartment = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setFormError('');
      await onCreateDepartment(newDepartment);
      setNewDepartment({ name: '', code: '' });
    } catch (err: any) {
      setFormError(err?.message || 'No se pudo crear el departamento');
    }
  };

  const submitEmployee = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setFormError('');
      await onCreateEmployee(newEmployee);
      setNewEmployee({ employeeName: '', departmentId: '', role: '', hourlyCost: 20, weeklyCapacityHours: 40, workLocationCountryCode: 'CO', workLocationSubdivisionCode: '' });
    } catch (err: any) {
      setFormError(err?.message || 'No se pudo crear el empleado');
    }
  };

  const submitTask = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setFormError('');
      await onCreateTask({ ...newTask, durationDays: Number(newTask.durationDays) });
      setNewTask((v) => ({ ...v, title: '', description: '' }));
    } catch (err: any) {
      setFormError(err?.message || 'No se pudo crear el paquete de trabajo');
    }
  };

  return <div className="p-4 space-y-4">
    <header><h1 className="text-2xl font-bold">Vista Recursos (MVP)</h1><p className="text-slate-600">Planificación inteligente por empleado con reglas de calendario laboral.</p></header>

    <section className="border bg-white p-3 rounded space-y-3">
      <h2 className="font-semibold">Alta de datos</h2>
      {formError && <p className="text-sm text-red-600">{formError}</p>}
      <div className="grid md:grid-cols-3 gap-3">
        <form className="space-y-2 border p-2" onSubmit={submitDepartment}>
          <h3 className="font-medium text-sm">Nuevo grupo de trabajo</h3>
          <input className="border p-2 w-full" placeholder="Nombre" value={newDepartment.name} onChange={(e) => setNewDepartment((v) => ({ ...v, name: e.target.value }))} required />
          <input className="border p-2 w-full" placeholder="Código" value={newDepartment.code} onChange={(e) => setNewDepartment((v) => ({ ...v, code: e.target.value.toUpperCase() }))} required />
          <button className="border px-3 py-1 text-sm" type="submit">Crear grupo</button>
        </form>

        <form className="space-y-2 border p-2" onSubmit={submitEmployee}>
          <h3 className="font-medium text-sm">Nuevo empleado</h3>
          <input className="border p-2 w-full" placeholder="Nombre" value={newEmployee.employeeName} onChange={(e) => setNewEmployee((v) => ({ ...v, employeeName: e.target.value }))} required />
          <select className="border p-2 w-full" value={newEmployee.departmentId} onChange={(e) => setNewEmployee((v) => ({ ...v, departmentId: e.target.value }))} required>
            <option value="">Departamento...</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <input className="border p-2 w-full" placeholder="Rol" value={newEmployee.role} onChange={(e) => setNewEmployee((v) => ({ ...v, role: e.target.value }))} required />
          <button className="border px-3 py-1 text-sm" type="submit">Crear empleado</button>
        </form>

        <form className="space-y-2 border p-2" onSubmit={submitTask}>
          <h3 className="font-medium text-sm">Nuevo paquete de trabajo</h3>
          <input className="border p-2 w-full" placeholder="Título" value={newTask.title} onChange={(e) => setNewTask((v) => ({ ...v, title: e.target.value }))} required />
          <select className="border p-2 w-full" value={newTask.employeeId} onChange={(e) => {
            const employeeId = e.target.value;
            const employee = employees.find((x) => x.employeeId === employeeId);
            setNewTask((v) => ({ ...v, employeeId, departmentId: employee?.departmentId || v.departmentId }));
          }} required>
            <option value="">Empleado...</option>
            {employees.map((emp) => <option key={emp.employeeId} value={emp.employeeId}>{emp.employeeName}</option>)}
          </select>
          <select className="border p-2 w-full" value={newTask.projectId} onChange={(e) => setNewTask((v) => ({ ...v, projectId: e.target.value }))} required>
            <option value="">Proyecto...</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.projectName}</option>)}
          </select>
          <button className="border px-3 py-1 text-sm" type="submit">Crear paquete</button>
        </form>
      </div>
    </section>

    <div className="flex gap-2"><select className="border p-2" value={department} onChange={(e) => setDepartment(e.target.value)}><option value="all">Todos</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select><input className="border p-2 flex-1" placeholder="Buscar" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-sm text-slate-600">Rango visible: {format(dates[0], 'dd MMM yyyy', { locale: es })} - {format(dates[dates.length - 1], 'dd MMM yyyy', { locale: es })}</span>
      <button className="border px-3 py-1 text-sm" onClick={() => setRangeOffsetDays((v) => v - 30)}>← Mes anterior</button>
      <button className="border px-3 py-1 text-sm" onClick={() => setRangeOffsetDays((v) => v + 30)}>Mes siguiente →</button>
      <button className="border px-3 py-1 text-sm" onClick={() => setRangeOffsetDays(0)}>Hoy</button>
    </div>
    <div className="flex flex-wrap gap-2">{projects.map((p) => <span key={p.id} className="px-2 py-1 rounded text-white text-xs" style={{ background: p.colorHex }}>{p.projectName}</span>)}</div>

    <div className="overflow-auto border bg-white">
      <div className="sticky top-0 z-20 bg-white border-b">
        <div className="flex">
          <div className="sticky left-0 bg-white z-30 w-[220px] md:w-[220px] max-md:w-[160px] border-r" />
          <div className="flex min-w-max">
            {Array.from(new Set(dates.map((d) => getISOWeek(d)))).map((week) => {
              const weekDays = dates.filter((d) => getISOWeek(d) === week);
              return <div key={`${week}-${weekDays[0].toISOString()}`} style={{ width: weekDays.length * dayW }} className="border-r text-xs text-center shrink-0">KW {week} {format(weekDays[0], 'dd MMM', { locale: de })}-{format(weekDays[weekDays.length - 1], 'dd MMM', { locale: de })}</div>;
            })}
          </div>
        </div>
        <div className="flex">
          <div className="sticky left-0 z-30 bg-white w-[220px] md:w-[220px] max-md:w-[160px] border-r text-xs p-1">Departamento / Empleado</div>
          {dates.map((d) => <div key={d.toISOString()} style={{ width: dayW }} className={`text-center text-[10px] shrink-0 ${isWeekend(d) ? 'bg-blue-50' : ''}`}>{format(d, 'EE d', { locale: es })}</div>)}
        </div>
      </div>

      {grouped.map((dep) => <div key={dep.id}><div className="sticky left-0 bg-slate-100 p-2 font-semibold border-b">{dep.name}</div>
        {dep.employees.map((e: any) => <div key={e.employeeId} className="relative flex border-b h-[52px]">
          <button onClick={() => setEmployeeModal(e)} className="sticky left-0 z-10 bg-white border-r text-left px-2 w-[220px] md:w-[220px] max-md:w-[160px]">{e.employeeName}</button>
          <div className="relative flex min-w-max">{dates.map((d) => <div key={d.toISOString()} style={{ width: dayW }} className={`${isWeekend(d) ? 'bg-blue-50' : ''} border-r shrink-0`} />)}</div>
          {tasks.filter((t) => t.employeeId === e.employeeId).map((t: any) => {
            const left = differenceInCalendarDays(new Date(t.scheduledStartDate), start) * dayW;
            const width = Math.max(1, differenceInCalendarDays(new Date(t.scheduledEndDateExclusive), new Date(t.scheduledStartDate))) * dayW;
            return <button key={t.id} onClick={() => setTaskModal(t)} className="absolute top-2 h-8 rounded text-white text-xs px-2 text-left overflow-hidden" style={{ left: 220 + left, width, background: t.project?.colorHex || '#334155' }}>{t.title} · {t.project?.projectName}</button>;
          })}
        </div>)}
      </div>)}
    </div>

    {taskModal && <Modal onClose={() => setTaskModal(null)} title={taskModal.title}><p>Proyecto: {taskModal.project?.projectName}</p><p>Prioridad: {taskModal.priority}</p><p>Duración: {taskModal.durationDays} días</p><p>Inicio: {String(taskModal.scheduledStartDate).slice(0, 10)}</p></Modal>}
    {employeeModal && <Modal onClose={() => setEmployeeModal(null)} title={employeeModal.employeeName}><p>Rol: {employeeModal.role}</p><p>Coste/h: {employeeModal.hourlyCost}</p><p>Capacidad semanal: {employeeModal.weeklyCapacityHours}h</p></Modal>}
  </div>;
}

function Modal({ title, children, onClose }: any) {
  return <div onClick={onClose} className="fixed inset-0 bg-black/50 flex items-center justify-center"><div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-lg max-md:max-w-none max-md:h-full p-4"><button aria-label="Close modal" onClick={onClose} className="float-right">✕</button><h2 className="text-lg font-bold">{title}</h2>{children}</div></div>;
}
