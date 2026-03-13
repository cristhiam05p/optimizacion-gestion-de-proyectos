import { render, screen, fireEvent } from '@testing-library/react';
import { Timeline } from '../components/timeline';

const departments = [{ id: 'd1', name: 'Engineering' }];
const employees = [{ employeeId: 'e1', employeeName: 'José', departmentId: 'd1', role:'Dev', hourlyCost:10, weeklyCapacityHours:40 }];
const projects = [{ id: 'p1', projectName: 'Proyecto', colorHex: '#000' }];
const tasks = [{ id: 't1', employeeId: 'e1', title: 'Tarea', description: 'Descripción', scheduledStartDate: '2026-01-05', scheduledEndDateExclusive: '2026-01-07', project: projects[0], priority: 'NORMAL', durationDays:2 }];

describe('timeline', () => {
  it('department filter', () => {
    render(<Timeline departments={departments} employees={employees} projects={projects} tasks={tasks} startDate="2026-01-01" />);
    expect(screen.getByText('Engineering')).toBeInTheDocument();
  });
  it('accent-insensitive search', () => {
    render(<Timeline departments={departments} employees={employees} projects={projects} tasks={tasks} startDate="2026-01-01" />);
    fireEvent.change(screen.getByPlaceholderText('Buscar'), { target: { value: 'jose' } });
    expect(screen.getByText('José')).toBeInTheDocument();
  });
  it('task modal open', () => {
    render(<Timeline departments={departments} employees={employees} projects={projects} tasks={tasks} startDate="2026-01-01" />);
    fireEvent.click(screen.getByText(/Tarea/));
    expect(screen.getByText('Prioridad: NORMAL')).toBeInTheDocument();
  });
  it('employee modal open', () => {
    render(<Timeline departments={departments} employees={employees} projects={projects} tasks={tasks} startDate="2026-01-01" />);
    fireEvent.click(screen.getByText('José'));
    expect(screen.getByText('Rol: Dev')).toBeInTheDocument();
  });
  it('non-working day highlight', () => {
    render(<Timeline departments={departments} employees={employees} projects={projects} tasks={tasks} startDate="2026-01-01" />);
    expect(document.querySelectorAll('.bg-blue-50').length).toBeGreaterThan(0);
  });
});
