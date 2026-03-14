'use client';
import React from 'react';
import { FormEvent, useMemo, useState } from 'react';
import { addDays, differenceInCalendarDays, eachDayOfInterval, format, getISOWeek, isWeekend, parseISO } from 'date-fns';
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

export function Timeline({ employees, departments, projects, tasks, startDate, onCreateDepartment, onCreateEmployee, onCreateTask, onCreateProject }: Props) {
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
    departmentId: '', employeeId: '', projectId: '', title: '', description: '',
    earliestStartDate: startDate, deadlineDate: addDays(parseISO(startDate), 7).toISOString().slice(0, 10), durationDays: 3,
    priority: 'NORMAL', status: 'PLANNED'
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
      setNewTask((v) => ({ ...v, title: '', description: '' }));
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

  return <div className="p-4 space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <p className="text-slate-600">{t.subtitle}</p>
      </div>
      <select className="border p-2" value={language} onChange={(e) => setLanguage(e.target.value as Lang)}>
        <option value="es">Español</option>
        <option value="en">English</option>
        <option value="de">Deutsch</option>
      </select>
    </header>

    <section className="border bg-white p-3 rounded space-y-3">
      <h2 className="font-semibold">{t.createData}</h2>
      <div className="flex flex-wrap gap-2">
        <button className="border px-3 py-1 text-sm" onClick={() => setCreationModal('department')}>{t.createDepartment}</button>
        <button className="border px-3 py-1 text-sm disabled:opacity-50" disabled={!canCreateEmployee} title={!canCreateEmployee ? t.disabledEmployee : ''} onClick={() => setCreationModal('employee')}>{t.createEmployee}</button>
        <button className="border px-3 py-1 text-sm" onClick={() => setCreationModal('project')}>{t.createProject}</button>
        <button className="border px-3 py-1 text-sm disabled:opacity-50" disabled={!canCreateTask} title={!canCreateTask ? t.disabledTask : ''} onClick={() => setCreationModal('task')}>{t.createTask}</button>
      </div>
      {(!canCreateEmployee || !canCreateTask) && (
        <div className="text-xs text-slate-500 space-y-1">
          {!canCreateEmployee && <p>{t.disabledEmployee}</p>}
          {!canCreateTask && <p>{t.disabledTask}</p>}
        </div>
      )}
    </section>

    <div className="flex gap-2">
      <select className="border p-2" value={department} onChange={(e) => setDepartment(e.target.value)}>
        <option value="all">{t.all}</option>
        {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
      <input className="border p-2 flex-1" placeholder={t.search} value={query} onChange={(e) => setQuery(e.target.value)} />
    </div>

    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-sm text-slate-600">{t.visibleRange}: {format(dates[0], 'dd MMM yyyy', { locale })} - {format(dates[dates.length - 1], 'dd MMM yyyy', { locale })}</span>
      <button className="border px-3 py-1 text-sm" onClick={() => setRangeOffsetDays((v) => v - 30)}>{t.previousMonth}</button>
      <button className="border px-3 py-1 text-sm" onClick={() => setRangeOffsetDays((v) => v + 30)}>{t.nextMonth}</button>
      <button className="border px-3 py-1 text-sm" onClick={() => setRangeOffsetDays(0)}>{t.today}</button>
    </div>

    <div className="flex flex-wrap gap-2">{projects.map((p) => <span key={p.id} className="px-2 py-1 rounded text-white text-xs" style={{ background: p.colorHex }}>{p.projectName}</span>)}</div>

    <div className="overflow-auto border bg-white">
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

    {taskModal && <Modal onClose={() => setTaskModal(null)} title={taskModal.title}><p>{t.taskProject}: {taskModal.project?.projectName}</p><p>{t.taskPriority}: {taskModal.priority}</p><p>{t.taskDuration}: {taskModal.durationDays} {t.days}</p><p>{t.taskStart}: {String(taskModal.scheduledStartDate).slice(0, 10)}</p></Modal>}
    {employeeModal && <Modal onClose={() => setEmployeeModal(null)} title={employeeModal.employeeName}><p>{t.employeeRole}: {employeeModal.role}</p><p>{t.employeeCost}: {employeeModal.hourlyCost}</p><p>{t.employeeCapacity}: {employeeModal.weeklyCapacityHours}{t.hours}</p></Modal>}

    {creationModal === 'department' && (
      <Modal onClose={closeCreationModal} title={t.createDepartment}>
        {formError && <p className="text-sm text-red-600">{formError}</p>}
        <form className="space-y-2 mt-2" onSubmit={submitDepartment}>
          <input className="border p-2 w-full" placeholder={t.name} value={newDepartment.name} onChange={(e) => setNewDepartment((v) => ({ ...v, name: e.target.value }))} required />
          <input className="border p-2 w-full" placeholder={t.code} value={newDepartment.code} onChange={(e) => setNewDepartment((v) => ({ ...v, code: e.target.value.toUpperCase() }))} required />
          <button className="border px-3 py-1 text-sm" type="submit">{t.saveDepartment}</button>
        </form>
      </Modal>
    )}

    {creationModal === 'employee' && (
      <Modal onClose={closeCreationModal} title={t.createEmployee}>
        {formError && <p className="text-sm text-red-600">{formError}</p>}
        <form className="space-y-2 mt-2" onSubmit={submitEmployee}>
          <input className="border p-2 w-full" placeholder={t.name} value={newEmployee.employeeName} onChange={(e) => setNewEmployee((v) => ({ ...v, employeeName: e.target.value }))} required />
          <select className="border p-2 w-full" value={newEmployee.departmentId} onChange={(e) => setNewEmployee((v) => ({ ...v, departmentId: e.target.value }))} required>
            <option value="">{t.departmentPlaceholder}</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <input className="border p-2 w-full" placeholder={t.role} value={newEmployee.role} onChange={(e) => setNewEmployee((v) => ({ ...v, role: e.target.value }))} required />
          <button className="border px-3 py-1 text-sm" type="submit">{t.saveEmployee}</button>
        </form>
      </Modal>
    )}

    {creationModal === 'project' && (
      <Modal onClose={closeCreationModal} title={t.createProject}>
        {formError && <p className="text-sm text-red-600">{formError}</p>}
        <form className="space-y-2 mt-2" onSubmit={submitProject}>
          <input className="border p-2 w-full" placeholder={t.titleField} value={newProject.projectName} onChange={(e) => setNewProject((v) => ({ ...v, projectName: e.target.value }))} required />
          <input className="border p-2 w-full" placeholder={t.code} value={newProject.projectCode} onChange={(e) => setNewProject((v) => ({ ...v, projectCode: e.target.value.toUpperCase() }))} required />
          <input className="border p-2 w-full" placeholder={t.client} value={newProject.clientName} onChange={(e) => setNewProject((v) => ({ ...v, clientName: e.target.value }))} required />
          <label className="text-sm">{t.color}</label>
          <input className="border p-1 w-full" type="color" value={newProject.colorHex} onChange={(e) => setNewProject((v) => ({ ...v, colorHex: e.target.value }))} required />
          <button className="border px-3 py-1 text-sm" type="submit">{t.saveProject}</button>
        </form>
      </Modal>
    )}

    {creationModal === 'task' && (
      <Modal onClose={closeCreationModal} title={t.createTask}>
        {formError && <p className="text-sm text-red-600">{formError}</p>}
        <form className="space-y-2 mt-2" onSubmit={submitTask}>
          <input className="border p-2 w-full" placeholder={t.titleField} value={newTask.title} onChange={(e) => setNewTask((v) => ({ ...v, title: e.target.value }))} required />
          <input className="border p-2 w-full" placeholder={t.description} value={newTask.description} onChange={(e) => setNewTask((v) => ({ ...v, description: e.target.value }))} required />
          <select className="border p-2 w-full" value={newTask.employeeId} onChange={(e) => {
            const employeeId = e.target.value;
            const employee = employees.find((x) => x.employeeId === employeeId);
            setNewTask((v) => ({ ...v, employeeId, departmentId: employee?.departmentId || v.departmentId }));
          }} required>
            <option value="">{t.employeePlaceholder}</option>
            {employees.map((emp) => <option key={emp.employeeId} value={emp.employeeId}>{emp.employeeName}</option>)}
          </select>
          <select className="border p-2 w-full" value={newTask.projectId} onChange={(e) => setNewTask((v) => ({ ...v, projectId: e.target.value }))} required>
            <option value="">{t.projectPlaceholder}</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.projectName}</option>)}
          </select>
          <button className="border px-3 py-1 text-sm" type="submit">{t.saveTask}</button>
        </form>
      </Modal>
    )}
  </div>;
}

function Modal({ title, children, onClose }: any) {
  return <div onClick={onClose} className="fixed inset-0 bg-black/50 flex items-center justify-center"><div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-lg max-md:max-w-none max-md:h-full p-4"><button aria-label="Close modal" onClick={onClose} className="float-right">✕</button><h2 className="text-lg font-bold">{title}</h2>{children}</div></div>;
}
