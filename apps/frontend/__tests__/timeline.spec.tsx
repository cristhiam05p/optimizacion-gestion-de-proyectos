import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Timeline } from '../components/timeline';

const departments = [{ id: 'd1', name: 'Engineering' }];
const employees = [{ employeeId: 'e1', employeeName: 'José', departmentId: 'd1', role: 'Dev', hourlyCost: 10, weeklyCapacityHours: 40 }];
const projects = [{ id: 'p1', projectName: 'Proyecto', colorHex: '#000' }];
const tasks = [{ id: 't1', employeeId: 'e1', title: 'Tarea', description: 'Descripción', scheduledStartDate: '2026-01-05', scheduledEndDateExclusive: '2026-01-07', project: projects[0], priority: 'NORMAL', durationDays: 2 }];

const renderTimeline = () => render(
  <Timeline
    departments={departments}
    employees={employees}
    projects={projects}
    tasks={tasks}
    startDate="2026-01-01"
    onCreateDepartment={async () => undefined}
    onCreateEmployee={async () => undefined}
    onUpdateEmployee={async () => undefined}
    onDeleteEmployee={async () => undefined}
    onCreateTask={async () => undefined}
    onUpdateTask={async () => undefined}
    onDeleteTask={async () => undefined}
    onCreateProject={async () => undefined}
  />
);

describe('timeline', () => {
  it('department filter', () => {
    renderTimeline();
    expect(screen.getAllByText('Engineering').length).toBeGreaterThan(0);
  });
  it('accent-insensitive search', () => {
    renderTimeline();
    fireEvent.change(screen.getByPlaceholderText('Buscar'), { target: { value: 'jose' } });
    expect(screen.getAllByText('José').length).toBeGreaterThan(0);
  });
  it('task modal open', () => {
    renderTimeline();
    fireEvent.click(screen.getByText(/Tarea/));
    expect(screen.getByText('Prioridad: NORMAL')).toBeInTheDocument();
  });
  it('employee modal open', () => {
    renderTimeline();
    fireEvent.click(screen.getByRole('button', { name: 'José' }));
    expect(screen.getByText('Rol: Dev')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Añadir paquete a este trabajador' })).toBeInTheDocument();
  });

  it('task modal shows title, description and end date', () => {
    renderTimeline();
    fireEvent.click(screen.getByText(/Tarea/));
    expect(screen.getByText('Descripción: Descripción')).toBeInTheDocument();
    expect(screen.getByText('Fin: 2026-01-06')).toBeInTheDocument();
    expect(screen.getByLabelText('Línea de tiempo')).toBeInTheDocument();
  });

  it('project filter hides tasks from other projects', () => {
    render(
      <Timeline
        departments={departments}
        employees={employees}
        projects={[projects[0], { id: 'p2', projectName: 'Otro', colorHex: '#333' }]}
        tasks={[...tasks, { ...tasks[0], id: 't2', title: 'Otra', projectId: 'p2', project: { id: 'p2', projectName: 'Otro', colorHex: '#333' } }]}
        startDate="2026-01-01"
        onCreateDepartment={async () => undefined}
        onCreateEmployee={async () => undefined}
        onUpdateEmployee={async () => undefined}
        onDeleteEmployee={async () => undefined}
        onCreateTask={async () => undefined}
        onUpdateTask={async () => undefined}
        onDeleteTask={async () => undefined}
        onCreateProject={async () => undefined}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Proyecto' }));
    expect(screen.queryByText(/Otra · Otro/)).not.toBeInTheDocument();
  });


  it('renders task bar width from working duration instead of stale exclusive end date', () => {
    render(
      <Timeline
        departments={departments}
        employees={employees}
        projects={projects}
        tasks={[{ ...tasks[0], id: 't-width', durationDays: 2, scheduledEndDateExclusive: '2026-01-25' }]}
        startDate="2026-01-01"
        onCreateDepartment={async () => undefined}
        onCreateEmployee={async () => undefined}
        onUpdateEmployee={async () => undefined}
        onDeleteEmployee={async () => undefined}
        onCreateTask={async () => undefined}
        onUpdateTask={async () => undefined}
        onDeleteTask={async () => undefined}
        onCreateProject={async () => undefined}
      />
    );

    const taskBar = screen.getByRole('button', { name: /Tarea · Proyecto/ });
    expect(taskBar).toHaveStyle({ width: '84px' });
  });

  it('non-working day highlight', () => {
    renderTimeline();
    expect(document.querySelectorAll('.bg-slate-100').length).toBeGreaterThan(0);
  });
  it('time range navigation is visible', () => {
    renderTimeline();
    expect(screen.getByText('Mes siguiente →')).toBeInTheDocument();
    expect(screen.getByText('← Mes anterior')).toBeInTheDocument();
    expect(screen.getByText('Hoy')).toBeInTheDocument();
  });

  it('maps wheel vertical intent to horizontal-only movement in planning area', () => {
    renderTimeline();
    const planning = screen.getByTestId('planning-scroll');
    Object.defineProperty(planning, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(planning, 'scrollWidth', { value: 3000, configurable: true });
    Object.defineProperty(planning, 'scrollLeft', { value: 100, writable: true, configurable: true });

    fireEvent.wheel(planning, { deltaY: 120, deltaX: 0 });

    expect((planning as HTMLDivElement).scrollLeft).toBe(220);
  });

  it('extends timeline dynamically while approaching right edge', () => {
    renderTimeline();
    const planning = screen.getByTestId('planning-scroll');
    Object.defineProperty(planning, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(planning, 'scrollWidth', { value: 7800, configurable: true });
    Object.defineProperty(planning, 'scrollLeft', { value: 7000, writable: true, configurable: true });

    const before = screen.getAllByTestId('timeline-day-header').length;
    fireEvent.scroll(planning);
    const after = screen.getAllByTestId('timeline-day-header').length;

    expect(after).toBeGreaterThan(before);
  });

  it('go to today resets the visible range anchor after timeline extension', () => {
    renderTimeline();
    const planning = screen.getByTestId('planning-scroll');
    Object.defineProperty(planning, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(planning, 'scrollWidth', { value: 7800, configurable: true });
    Object.defineProperty(planning, 'scrollLeft', { value: 10, writable: true, configurable: true });

    const initialHeader = screen.getAllByTestId('timeline-day-header')[0].textContent;

    fireEvent.scroll(planning);
    const shiftedHeader = screen.getAllByTestId('timeline-day-header')[0].textContent;

    fireEvent.click(screen.getByText('Hoy'));
    const resetHeader = screen.getAllByTestId('timeline-day-header')[0].textContent;

    expect(shiftedHeader).not.toBe(initialHeader);
    expect(resetHeader).toBe(initialHeader);
  });

  it('keeps vertical scroll position while converting wheel to horizontal movement', () => {
    renderTimeline();
    const planning = screen.getByTestId('planning-scroll');
    Object.defineProperty(planning, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(planning, 'scrollWidth', { value: 3000, configurable: true });
    Object.defineProperty(planning, 'scrollLeft', { value: 100, writable: true, configurable: true });
    Object.defineProperty(planning, 'scrollTop', { value: 220, writable: true, configurable: true });

    const event = new WheelEvent('wheel', { deltaY: 120, deltaX: 0, bubbles: true, cancelable: true });
    planning.dispatchEvent(event);

    expect((planning as HTMLDivElement).scrollTop).toBe(220);
    expect((planning as HTMLDivElement).scrollLeft).toBe(220);
  });

  it('opens create department modal from button', () => {
    renderTimeline();
    fireEvent.click(screen.getByText('Crear nuevo departamento'));
    expect(screen.getByRole('button', { name: 'Crear departamento' })).toBeInTheDocument();
  });

  it('language switch updates labels and date headers', () => {
    renderTimeline();
    fireEvent.change(screen.getByDisplayValue('Español'), { target: { value: 'en' } });
    expect(screen.getByText('Create new department')).toBeInTheDocument();
    expect(screen.getAllByText(/Wk/).length).toBeGreaterThan(0);
  });

  it('task form shows duration and dates and defaults by one-week window', () => {
    renderTimeline();
    fireEvent.click(screen.getByText('Crear nuevo paquete de trabajo'));
    expect(screen.getByDisplayValue('5')).toBeInTheDocument();
    const dateInputs = screen.getAllByDisplayValue(/\d{4}-\d{2}-\d{2}/);
    expect(dateInputs.length).toBeGreaterThanOrEqual(2);
  });

  it('task form resets between openings while preserving single employee/project preselection', () => {
    renderTimeline();
    fireEvent.click(screen.getByText('Crear nuevo paquete de trabajo'));
    fireEvent.change(screen.getByPlaceholderText('Título'), { target: { value: 'Nuevo paquete' } });
    fireEvent.click(screen.getByRole('button', { name: 'Close modal' }));

    fireEvent.click(screen.getByText('Crear nuevo paquete de trabajo'));
    expect(screen.getByPlaceholderText('Título')).toHaveValue('');
    expect(screen.getByDisplayValue('José')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Proyecto')).toBeInTheDocument();
  });

});
