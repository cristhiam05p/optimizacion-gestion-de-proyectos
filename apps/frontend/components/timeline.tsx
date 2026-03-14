'use client';
import React from 'react';
import { FormEvent, useMemo, useState } from 'react';
import { addDays, differenceInCalendarDays, eachDayOfInterval, format, getISOWeek, isWeekend, parseISO } from 'date-fns';
import type { Locale } from 'date-fns';
import { de, enUS, es } from 'date-fns/locale';
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
  onCreateProject: (data: any) => Promise<void>;
};

type Lang = 'es' | 'en' | 'de';

const I18N: Record<Lang, any> = {
  es: {
    title: 'Vista Recursos (MVP)',
    subtitle: 'Planificación inteligente por empleado con reglas de calendario laboral.',
    loading: 'Cargando...',
    createData: 'Alta de datos',
    createDepartment: 'Crear nuevo departamento',
    createEmployee: 'Crear nuevo empleado',
    createTask: 'Crear nuevo paquete de trabajo',
    createProject: 'Crear nuevo proyecto',
    all: 'Todos',
    search: 'Buscar',
    visibleRange: 'Rango visible',
    previousMonth: '← Mes anterior',
    nextMonth: 'Mes siguiente →',
    today: 'Hoy',
    departmentEmployee: 'Departamento / Empleado',
    week: 'Sem',
    close: 'Cerrar',
    employeePlaceholder: 'Empleado...',
    projectPlaceholder: 'Proyecto...',
    departmentPlaceholder: 'Departamento...',
    name: 'Nombre',
    code: 'Código',
    role: 'Rol',
    titleField: 'Título',
    description: 'Descripción',
    client: 'Cliente',
    color: 'Color',
    saveDepartment: 'Crear departamento',
    saveEmployee: 'Crear empleado',
    saveTask: 'Crear paquete',
    saveProject: 'Crear proyecto',
    taskProject: 'Proyecto',
    taskPriority: 'Prioridad',
    taskDuration: 'Duración',
    days: 'días',
    taskStart: 'Inicio',
    taskEnd: 'Fin',
    employeeRole: 'Rol',
    employeeCost: 'Coste/h',
    employeeCapacity: 'Capacidad semanal',
    hours: 'h',
    errDepartment: 'No se pudo crear el departamento',
    errEmployee: 'No se pudo crear el empleado',
    errTask: 'No se pudo crear el paquete de trabajo',
    errProject: 'No se pudo crear el proyecto',
    disabledEmployee: 'Necesitas al menos un departamento',
    disabledTask: 'Necesitas al menos un empleado y un proyecto'
  },
  en: {
    title: 'Resource View (MVP)',
    subtitle: 'Smart employee planning with work-calendar rules.',
    loading: 'Loading...',
    createData: 'Create data',
    createDepartment: 'Create new department',
    createEmployee: 'Create new employee',
    createTask: 'Create new work package',
    createProject: 'Create new project',
    all: 'All',
    search: 'Search',
    visibleRange: 'Visible range',
    previousMonth: '← Previous month',
    nextMonth: 'Next month →',
    today: 'Today',
    departmentEmployee: 'Department / Employee',
    week: 'Wk',
    close: 'Close',
    employeePlaceholder: 'Employee...',
    projectPlaceholder: 'Project...',
    departmentPlaceholder: 'Department...',
    name: 'Name',
    code: 'Code',
    role: 'Role',
    titleField: 'Title',
    description: 'Description',
    client: 'Client',
    color: 'Color',
    saveDepartment: 'Create department',
    saveEmployee: 'Create employee',
    saveTask: 'Create package',
    saveProject: 'Create project',
    taskProject: 'Project',
    taskPriority: 'Priority',
    taskDuration: 'Duration',
    days: 'days',
    taskStart: 'Start',
    taskEnd: 'End',
    employeeRole: 'Role',
    employeeCost: 'Cost/h',
    employeeCapacity: 'Weekly capacity',
    hours: 'h',
    errDepartment: 'Could not create department',
    errEmployee: 'Could not create employee',
    errTask: 'Could not create work package',
    errProject: 'Could not create project',
    disabledEmployee: 'You need at least one department',
    disabledTask: 'You need at least one employee and one project'
  },
  de: {
    title: 'Ressourcenansicht (MVP)',
    subtitle: 'Intelligente Mitarbeiterplanung mit Arbeitskalender-Regeln.',
    loading: 'Laden...',
    createData: 'Daten anlegen',
    createDepartment: 'Neue Abteilung erstellen',
    createEmployee: 'Neuen Mitarbeiter erstellen',
    createTask: 'Neues Arbeitspaket erstellen',
    createProject: 'Neues Projekt erstellen',
    all: 'Alle',
    search: 'Suchen',
    visibleRange: 'Sichtbarer Bereich',
    previousMonth: '← Vorheriger Monat',
    nextMonth: 'Nächster Monat →',
    today: 'Heute',
    departmentEmployee: 'Abteilung / Mitarbeiter',
    week: 'KW',
    close: 'Schließen',
    employeePlaceholder: 'Mitarbeiter...',
    projectPlaceholder: 'Projekt...',
    departmentPlaceholder: 'Abteilung...',
    name: 'Name',
    code: 'Code',
    role: 'Rolle',
    titleField: 'Titel',
    description: 'Beschreibung',
    client: 'Kunde',
    color: 'Farbe',
    saveDepartment: 'Abteilung erstellen',
    saveEmployee: 'Mitarbeiter erstellen',
    saveTask: 'Paket erstellen',
    saveProject: 'Projekt erstellen',
    taskProject: 'Projekt',
    taskPriority: 'Priorität',
    taskDuration: 'Dauer',
    days: 'Tage',
    taskStart: 'Start',
    taskEnd: 'End',
    employeeRole: 'Rolle',
    employeeCost: 'Kosten/h',
    employeeCapacity: 'Wochenkapazität',
    hours: 'h',
    errDepartment: 'Abteilung konnte nicht erstellt werden',
    errEmployee: 'Mitarbeiter konnte nicht erstellt werden',
    errTask: 'Arbeitspaket konnte nicht erstellt werden',
    errProject: 'Projekt konnte nicht erstellt werden',
    disabledEmployee: 'Mindestens eine Abteilung erforderlich',
    disabledTask: 'Mindestens ein Mitarbeiter und ein Projekt erforderlich'
  }
};

const DATE_LOCALE: Record<Lang, Locale> = { es, en: enUS, de };

const DEFAULT_TASK_DURATION_DAYS = 5;

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function nextWorkingDay(date: Date) {
  const current = new Date(date);
  while (isWeekend(current)) current.setDate(current.getDate() + 1);
  return current;
}

function addWorkingDaysFrom(startDateISO: string, durationDays: number) {
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

function countWorkingDaysInclusive(startDateISO: string, endDateISO: string) {
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

export function Timeline({ employees, departments, projects, tasks, startDate, onCreateDepartment, onCreateEmployee, onCreateTask, onCreateProject }: Props) {
  const getEmployeeNextFreeDate = (employeeId: string) => {
    const today = nextWorkingDay(new Date());
    if (!employeeId) return toISODate(today);
    const employeeTasks = tasks.filter((task) => task.employeeId === employeeId && task.scheduledEndDateExclusive);
    if (!employeeTasks.length) return toISODate(today);

    const furthestEnd = employeeTasks.reduce((latest, task) => {
      const endDate = parseISO(task.scheduledEndDateExclusive);
      return endDate > latest ? endDate : latest;
    }, today);

    return toISODate(nextWorkingDay(furthestEnd > today ? furthestEnd : today));
  };

  const buildInitialTaskState = (employeeId?: string) => {
    const hasSingleEmployee = employees.length === 1;
    const hasSingleProject = projects.length === 1;
    const selectedEmployeeId = employeeId || (hasSingleEmployee ? employees[0].employeeId : '');
    const employee = employees.find((x) => x.employeeId === selectedEmployeeId);
    const earliestStartDate = getEmployeeNextFreeDate(selectedEmployeeId);

    return {
      departmentId: employee?.departmentId || '',
      employeeId: selectedEmployeeId,
      projectId: hasSingleProject ? projects[0].id : '',
      title: '',
      description: '',
      earliestStartDate,
      deadlineDate: addWorkingDaysFrom(earliestStartDate, DEFAULT_TASK_DURATION_DAYS),
      durationDays: DEFAULT_TASK_DURATION_DAYS,
      priority: 'NORMAL',
      status: 'PLANNED'
    };
  };

  const [language, setLanguage] = useState<Lang>('es');
  const [department, setDepartment] = useState('all');
  const [query, setQuery] = useState('');
  const [taskModal, setTaskModal] = useState<any>(null);
  const [employeeModal, setEmployeeModal] = useState<any>(null);
  const [creationModal, setCreationModal] = useState<'department' | 'employee' | 'task' | 'project' | null>(null);
  const [rangeOffsetDays, setRangeOffsetDays] = useState(0);
  const [formError, setFormError] = useState('');

  const [newDepartment, setNewDepartment] = useState({ name: '', code: '' });
  const [newEmployee, setNewEmployee] = useState({
    employeeName: '', departmentId: '', role: '', hourlyCost: 20, weeklyCapacityHours: 40, workLocationCountryCode: 'CO', workLocationSubdivisionCode: ''
  });
  const [newTask, setNewTask] = useState({
    ...buildInitialTaskState(),
  });
  const [newProject, setNewProject] = useState({ projectName: '', projectCode: '', colorHex: '#2563eb', clientName: '', status: 'PLANNED' });

  const t = I18N[language];
  const locale = DATE_LOCALE[language];
  const leftColumnWidth = 260;

  const days = 90;
  const dayW = 42;
  const start = addDays(parseISO(startDate), rangeOffsetDays);
  const dates = eachDayOfInterval({ start, end: addDays(start, days - 1) });

  const canCreateEmployee = departments.length > 0;
  const canCreateTask = employees.length > 0 && projects.length > 0;

  const filteredEmployees = useMemo(() => employees.filter((e) => {
    if (department !== 'all' && e.departmentId !== department) return false;
    if (!query) return true;
    const q = normalize(query);
    const ownTasks = tasks.filter((x) => x.employeeId === e.employeeId);
    const hay = normalize(`${e.employeeName} ${ownTasks.map((x: any) => `${x.title} ${x.description} ${x.project?.projectName || ''}`).join(' ')}`);
    return hay.includes(q);
  }), [department, employees, query, tasks]);

  const grouped = departments.map((d) => ({ ...d, employees: filteredEmployees.filter((e) => e.departmentId === d.id) })).filter((d) => d.employees.length);

  const closeCreationModal = () => {
    setCreationModal(null);
    setFormError('');
  };

  const openCreationModal = (type: 'department' | 'employee' | 'task' | 'project') => {
    setFormError('');
    if (type === 'department') setNewDepartment({ name: '', code: '' });
    if (type === 'employee') {
      setNewEmployee({
        employeeName: '',
        departmentId: departments.length === 1 ? departments[0].id : '',
        role: '',
        hourlyCost: 20,
        weeklyCapacityHours: 40,
        workLocationCountryCode: 'CO',
        workLocationSubdivisionCode: ''
      });
    }
    if (type === 'project') setNewProject({ projectName: '', projectCode: '', colorHex: '#2563eb', clientName: '', status: 'PLANNED' });
    if (type === 'task') setNewTask(buildInitialTaskState());
    setCreationModal(type);
  };

  const submitDepartment = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setFormError('');
      await onCreateDepartment(newDepartment);
      setNewDepartment({ name: '', code: '' });
      closeCreationModal();
    } catch (err: any) {
      setFormError(err?.message || t.errDepartment);
    }
  };

  const submitEmployee = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setFormError('');
      await onCreateEmployee(newEmployee);
      setNewEmployee({ employeeName: '', departmentId: '', role: '', hourlyCost: 20, weeklyCapacityHours: 40, workLocationCountryCode: 'CO', workLocationSubdivisionCode: '' });
      closeCreationModal();
    } catch (err: any) {
      setFormError(err?.message || t.errEmployee);
    }
  };

  const submitTask = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setFormError('');
      await onCreateTask({ ...newTask, durationDays: Number(newTask.durationDays) });
      setNewTask(buildInitialTaskState());
      closeCreationModal();
    } catch (err: any) {
      setFormError(err?.message || t.errTask);
    }
  };

  const submitProject = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setFormError('');
      await onCreateProject(newProject);
      setNewProject({ projectName: '', projectCode: '', colorHex: '#2563eb', clientName: '', status: 'PLANNED' });
      closeCreationModal();
    } catch (err: any) {
      setFormError(err?.message || t.errProject);
    }
  };

  return <div className="mx-auto max-w-[1600px] p-4 md:p-6 space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200/70 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-800 px-5 py-4 text-white shadow-lg shadow-blue-900/20">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
        <p className="text-blue-100/90">{t.subtitle}</p>
      </div>
      <select className="rounded-lg border border-white/30 bg-white/10 p-2 text-sm text-white backdrop-blur-sm" value={language} onChange={(e) => setLanguage(e.target.value as Lang)}>
        <option className="text-slate-900" value="es">Español</option>
        <option className="text-slate-900" value="en">English</option>
        <option className="text-slate-900" value="de">Deutsch</option>
      </select>
    </header>

    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      <h2 className="text-lg font-semibold text-slate-800">{t.createData}</h2>
      <div className="flex flex-wrap gap-2">
        <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700" onClick={() => openCreationModal('department')}>{t.createDepartment}</button>
        <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50" disabled={!canCreateEmployee} title={!canCreateEmployee ? t.disabledEmployee : ''} onClick={() => openCreationModal('employee')}>{t.createEmployee}</button>
        <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700" onClick={() => openCreationModal('project')}>{t.createProject}</button>
        <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50" disabled={!canCreateTask} title={!canCreateTask ? t.disabledTask : ''} onClick={() => openCreationModal('task')}>{t.createTask}</button>
      </div>
      {(!canCreateEmployee || !canCreateTask) && (
        <div className="text-xs text-slate-500 space-y-1">
          {!canCreateEmployee && <p>{t.disabledEmployee}</p>}
          {!canCreateTask && <p>{t.disabledTask}</p>}
        </div>
      )}
    </section>

    <div className="grid gap-2 md:grid-cols-[200px_1fr]">
      <select className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm" value={department} onChange={(e) => setDepartment(e.target.value)}>
        <option value="all">{t.all}</option>
        {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
      <input className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm" placeholder={t.search} value={query} onChange={(e) => setQuery(e.target.value)} />
    </div>

    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-sm text-slate-600">{t.visibleRange}: {format(dates[0], 'dd MMM yyyy', { locale })} - {format(dates[dates.length - 1], 'dd MMM yyyy', { locale })}</span>
      <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm transition hover:bg-slate-50" onClick={() => setRangeOffsetDays((v) => v - 30)}>{t.previousMonth}</button>
      <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm transition hover:bg-slate-50" onClick={() => setRangeOffsetDays((v) => v + 30)}>{t.nextMonth}</button>
      <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm transition hover:bg-slate-50" onClick={() => setRangeOffsetDays(0)}>{t.today}</button>
    </div>

    <div className="flex flex-wrap gap-2">{projects.map((p) => <span key={p.id} className="px-2 py-1 rounded text-white text-xs" style={{ background: p.colorHex }}>{p.projectName}</span>)}</div>

    <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="sticky top-0 z-20 bg-white border-b">
        <div className="flex">
          <div className="sticky left-0 bg-white z-30 border-r" style={{ width: leftColumnWidth }} />
          <div className="flex min-w-max">
            {Array.from(new Set(dates.map((d) => getISOWeek(d)))).map((week) => {
              const weekDays = dates.filter((d) => getISOWeek(d) === week);
              return <div key={`${week}-${weekDays[0].toISOString()}`} style={{ width: weekDays.length * dayW }} className="border-r text-xs text-center shrink-0">{t.week} {week} {format(weekDays[0], 'dd MMM', { locale })}-{format(weekDays[weekDays.length - 1], 'dd MMM', { locale })}</div>;
            })}
          </div>
        </div>
        <div className="flex">
          <div className="sticky left-0 z-30 bg-white border-r text-xs p-1" style={{ width: leftColumnWidth }}>{t.departmentEmployee}</div>
          {dates.map((d) => <div key={d.toISOString()} style={{ width: dayW }} className={`text-center text-[10px] shrink-0 ${isWeekend(d) ? 'bg-blue-50' : ''}`}>{format(d, 'EE d', { locale })}</div>)}
        </div>
      </div>

      {grouped.map((dep) => <div key={dep.id}><div className="sticky left-0 bg-slate-100 p-2 font-semibold border-b" style={{ width: leftColumnWidth }}>{dep.name}</div>
        {dep.employees.map((e: any) => <div key={e.employeeId} className="relative flex border-b h-[52px]">
          <button onClick={() => setEmployeeModal(e)} className="sticky left-0 z-10 bg-white border-r text-left px-2" style={{ width: leftColumnWidth }}>{e.employeeName}</button>
          <div className="relative flex min-w-max">{dates.map((d) => <div key={d.toISOString()} style={{ width: dayW }} className={`${isWeekend(d) ? 'bg-blue-50' : ''} border-r shrink-0`} />)}</div>
          {tasks.filter((x) => x.employeeId === e.employeeId).map((task: any) => {
            const left = differenceInCalendarDays(new Date(task.scheduledStartDate), start) * dayW;
            const width = Math.max(1, differenceInCalendarDays(new Date(task.scheduledEndDateExclusive), new Date(task.scheduledStartDate))) * dayW;
            return <button key={task.id} onClick={() => setTaskModal(task)} className="absolute top-2 h-8 rounded text-white text-xs px-2 text-left overflow-hidden" style={{ left: leftColumnWidth + left, width, background: task.project?.colorHex || '#334155' }}>{task.title} · {task.project?.projectName}</button>;
          })}
        </div>)}
      </div>)}
    </div>

    {taskModal && <Modal onClose={() => setTaskModal(null)} title={taskModal.title}><p className="text-slate-700">{t.taskProject}: {taskModal.project?.projectName}</p><p className="text-slate-700">{t.taskPriority}: {taskModal.priority}</p><p className="text-slate-700">{t.taskDuration}: {taskModal.durationDays} {t.days}</p><p className="text-slate-700">{t.taskStart}: {String(taskModal.scheduledStartDate).slice(0, 10)}</p></Modal>}
    {employeeModal && <Modal onClose={() => setEmployeeModal(null)} title={employeeModal.employeeName}><p className="text-slate-700">{t.employeeRole}: {employeeModal.role}</p><p className="text-slate-700">{t.employeeCost}: {employeeModal.hourlyCost}</p><p className="text-slate-700">{t.employeeCapacity}: {employeeModal.weeklyCapacityHours}{t.hours}</p></Modal>}

    {creationModal === 'department' && (
      <Modal onClose={closeCreationModal} title={t.createDepartment}>
        {formError && <p className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>}
        <form className="space-y-3 mt-3" onSubmit={submitDepartment}>
          <input className="w-full rounded-lg border border-slate-200 p-3" placeholder={t.name} value={newDepartment.name} onChange={(e) => setNewDepartment((v) => ({ ...v, name: e.target.value }))} required />
          <input className="w-full rounded-lg border border-slate-200 p-3" placeholder={t.code} value={newDepartment.code} onChange={(e) => setNewDepartment((v) => ({ ...v, code: e.target.value.toUpperCase() }))} required />
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500" type="submit">{t.saveDepartment}</button>
        </form>
      </Modal>
    )}

    {creationModal === 'employee' && (
      <Modal onClose={closeCreationModal} title={t.createEmployee}>
        {formError && <p className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>}
        <form className="space-y-3 mt-3" onSubmit={submitEmployee}>
          <input className="w-full rounded-lg border border-slate-200 p-3" placeholder={t.name} value={newEmployee.employeeName} onChange={(e) => setNewEmployee((v) => ({ ...v, employeeName: e.target.value }))} required />
          <select className="w-full rounded-lg border border-slate-200 p-3" value={newEmployee.departmentId} onChange={(e) => setNewEmployee((v) => ({ ...v, departmentId: e.target.value }))} required>
            <option value="">{t.departmentPlaceholder}</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <input className="w-full rounded-lg border border-slate-200 p-3" placeholder={t.role} value={newEmployee.role} onChange={(e) => setNewEmployee((v) => ({ ...v, role: e.target.value }))} required />
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500" type="submit">{t.saveEmployee}</button>
        </form>
      </Modal>
    )}

    {creationModal === 'project' && (
      <Modal onClose={closeCreationModal} title={t.createProject}>
        {formError && <p className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>}
        <form className="space-y-3 mt-3" onSubmit={submitProject}>
          <input className="w-full rounded-lg border border-slate-200 p-3" placeholder={t.titleField} value={newProject.projectName} onChange={(e) => setNewProject((v) => ({ ...v, projectName: e.target.value }))} required />
          <input className="w-full rounded-lg border border-slate-200 p-3" placeholder={t.code} value={newProject.projectCode} onChange={(e) => setNewProject((v) => ({ ...v, projectCode: e.target.value.toUpperCase() }))} required />
          <input className="w-full rounded-lg border border-slate-200 p-3" placeholder={t.client} value={newProject.clientName} onChange={(e) => setNewProject((v) => ({ ...v, clientName: e.target.value }))} required />
          <label className="text-sm font-medium text-slate-700">{t.color}</label>
          <input className="h-12 w-full cursor-pointer rounded-lg border border-slate-200 p-1" type="color" value={newProject.colorHex} onChange={(e) => setNewProject((v) => ({ ...v, colorHex: e.target.value }))} required />
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500" type="submit">{t.saveProject}</button>
        </form>
      </Modal>
    )}

    {creationModal === 'task' && (
      <Modal onClose={closeCreationModal} title={t.createTask}>
        {formError && <p className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>}
        <form className="space-y-3 mt-3" onSubmit={submitTask}>
          <input className="w-full rounded-lg border border-slate-200 p-3" placeholder={t.titleField} value={newTask.title} onChange={(e) => setNewTask((v) => ({ ...v, title: e.target.value }))} required />
          <input className="w-full rounded-lg border border-slate-200 p-3" placeholder={t.description} value={newTask.description} onChange={(e) => setNewTask((v) => ({ ...v, description: e.target.value }))} required />
          <select className="w-full rounded-lg border border-slate-200 p-3" value={newTask.employeeId} onChange={(e) => {
            const employeeId = e.target.value;
            const employee = employees.find((x) => x.employeeId === employeeId);
            const earliestStartDate = getEmployeeNextFreeDate(employeeId);
            setNewTask((v) => ({
              ...v,
              employeeId,
              departmentId: employee?.departmentId || v.departmentId,
              earliestStartDate,
              deadlineDate: addWorkingDaysFrom(earliestStartDate, Number(v.durationDays) || DEFAULT_TASK_DURATION_DAYS)
            }));
          }} required>
            <option value="">{t.employeePlaceholder}</option>
            {employees.map((emp) => <option key={emp.employeeId} value={emp.employeeId}>{emp.employeeName}</option>)}
          </select>
          <select className="w-full rounded-lg border border-slate-200 p-3" value={newTask.projectId} onChange={(e) => setNewTask((v) => ({ ...v, projectId: e.target.value }))} required>
            <option value="">{t.projectPlaceholder}</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.projectName}</option>)}
          </select>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1 text-sm text-slate-700">
              <span>{t.taskDuration} ({t.days})</span>
              <input
                className="w-full rounded-lg border border-slate-200 p-3"
                type="number"
                min={1}
                value={newTask.durationDays}
                onChange={(e) => {
                  const durationDays = Math.max(1, Number(e.target.value) || 1);
                  setNewTask((v) => ({ ...v, durationDays, deadlineDate: addWorkingDaysFrom(v.earliestStartDate, durationDays) }));
                }}
                required
              />
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span>{t.taskStart}</span>
              <input
                className="w-full rounded-lg border border-slate-200 p-3"
                type="date"
                value={newTask.earliestStartDate}
                onChange={(e) => {
                  const earliestStartDate = toISODate(nextWorkingDay(parseISO(e.target.value)));
                  setNewTask((v) => ({ ...v, earliestStartDate, deadlineDate: addWorkingDaysFrom(earliestStartDate, Number(v.durationDays) || 1) }));
                }}
                required
              />
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span>{t.taskEnd}</span>
              <input
                className="w-full rounded-lg border border-slate-200 p-3"
                type="date"
                value={newTask.deadlineDate}
                onChange={(e) => {
                  const selectedEnd = e.target.value;
                  const durationDays = countWorkingDaysInclusive(newTask.earliestStartDate, selectedEnd);
                  setNewTask((v) => ({ ...v, durationDays, deadlineDate: addWorkingDaysFrom(v.earliestStartDate, durationDays) }));
                }}
                required
              />
            </label>
          </div>
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500" type="submit">{t.saveTask}</button>
        </form>
      </Modal>
    )}
  </div>;
}

function Modal({ title, children, onClose }: any) {
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
