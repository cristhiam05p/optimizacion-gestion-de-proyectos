'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Timeline } from '../components/timeline';
import { ActiveProjectsOverview } from '../components/active-projects-overview';
import { api } from '../lib/api';

export default function Page() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'timeline' | 'active-projects'>('timeline');
  const departments = useQuery({ queryKey: ['departments'], queryFn: () => api<any[]>('/departments') });
  const employees = useQuery({ queryKey: ['employees'], queryFn: () => api<any[]>('/employees') });
  const projects = useQuery({ queryKey: ['projects'], queryFn: () => api<any[]>('/projects') });
  const activeProjects = useQuery({ queryKey: ['projects', 'active-overview'], queryFn: () => api<any[]>('/projects/active-overview') });
  const tasks = useQuery({ queryKey: ['tasks'], queryFn: () => api<any[]>('/tasks') });

  const refreshAll = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['departments'] }),
    queryClient.invalidateQueries({ queryKey: ['employees'] }),
    queryClient.invalidateQueries({ queryKey: ['projects'] }),
    queryClient.invalidateQueries({ queryKey: ['projects', 'active-overview'] }),
    queryClient.invalidateQueries({ queryKey: ['tasks'] })
  ]);

  const createDepartment = useMutation({ mutationFn: (data: { name: string; code: string }) => api('/departments', { method: 'POST', body: JSON.stringify(data) }), onSuccess: refreshAll });
  const createEmployee = useMutation({ mutationFn: (data: any) => api('/employees', { method: 'POST', body: JSON.stringify(data) }), onSuccess: refreshAll });
  const updateEmployee = useMutation({ mutationFn: ({ employeeId, data }: { employeeId: string; data: any }) => api(`/employees/${employeeId}`, { method: 'PATCH', body: JSON.stringify(data) }), onSuccess: refreshAll });
  const deleteEmployee = useMutation({ mutationFn: (employeeId: string) => api(`/employees/${employeeId}`, { method: 'DELETE' }), onSuccess: refreshAll });
  const createTask = useMutation({ mutationFn: (data: any) => api('/tasks', { method: 'POST', body: JSON.stringify(data) }), onSuccess: refreshAll });
  const updateTask = useMutation({ mutationFn: ({ taskId, data }: { taskId: string; data: any }) => api(`/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(data) }), onSuccess: refreshAll });
  const deleteTask = useMutation({ mutationFn: (taskId: string) => api(`/tasks/${taskId}`, { method: 'DELETE' }), onSuccess: refreshAll });
  const createProject = useMutation({ mutationFn: (data: any) => api('/projects', { method: 'POST', body: JSON.stringify(data) }), onSuccess: refreshAll });

  if ([departments, employees, projects, activeProjects, tasks].some((q) => q.isLoading)) return <main className="p-6">Loading...</main>;
  if ([departments, employees, projects, activeProjects, tasks].some((q) => q.error)) return <main className="p-6">Error loading data</main>;

  return (
    <main className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setView('timeline')} className={`rounded-full px-4 py-2 text-sm font-medium ${view === 'timeline' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border border-slate-200'}`}>Vista de recursos</button>
        <button type="button" onClick={() => setView('active-projects')} className={`rounded-full px-4 py-2 text-sm font-medium ${view === 'active-projects' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border border-slate-200'}`}>Proyectos Activos</button>
      </div>

      {view === 'timeline' ? (
        <Timeline
          departments={departments.data!}
          employees={employees.data!}
          projects={projects.data!}
          tasks={tasks.data!}
          startDate={new Date().toISOString().slice(0, 10)}
          onCreateDepartment={(data) => createDepartment.mutateAsync(data).then(() => undefined)}
          onCreateEmployee={(data) => createEmployee.mutateAsync(data).then(() => undefined)}
          onUpdateEmployee={(employeeId, data) => updateEmployee.mutateAsync({ employeeId, data }).then(() => undefined)}
          onDeleteEmployee={(employeeId) => deleteEmployee.mutateAsync(employeeId).then(() => undefined)}
          onCreateTask={(data) => createTask.mutateAsync(data).then(() => undefined)}
          onUpdateTask={(taskId, data) => updateTask.mutateAsync({ taskId, data }).then(() => undefined)}
          onDeleteTask={(taskId) => deleteTask.mutateAsync(taskId).then(() => undefined)}
          onCreateProject={(data) => createProject.mutateAsync(data).then(() => undefined)}
        />
      ) : (
        <ActiveProjectsOverview projects={activeProjects.data!} employees={employees.data!} departments={departments.data!} tasks={tasks.data!} onUpdateTask={(taskId, data) => updateTask.mutateAsync({ taskId, data }).then(() => undefined)} onDeleteTask={(taskId) => deleteTask.mutateAsync(taskId).then(() => undefined)} />
      )}
    </main>
  );
}
