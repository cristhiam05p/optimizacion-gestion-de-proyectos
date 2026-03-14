'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Timeline } from '../components/timeline';
import { api } from '../lib/api';

export default function Page() {
  const queryClient = useQueryClient();
  const departments = useQuery({ queryKey: ['departments'], queryFn: () => api<any[]>('/departments') });
  const employees = useQuery({ queryKey: ['employees'], queryFn: () => api<any[]>('/employees') });
  const projects = useQuery({ queryKey: ['projects'], queryFn: () => api<any[]>('/projects') });
  const tasks = useQuery({ queryKey: ['tasks'], queryFn: () => api<any[]>('/tasks') });

  const refreshAll = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['departments'] }),
    queryClient.invalidateQueries({ queryKey: ['employees'] }),
    queryClient.invalidateQueries({ queryKey: ['projects'] }),
    queryClient.invalidateQueries({ queryKey: ['tasks'] })
  ]);

  const createDepartment = useMutation({
    mutationFn: (data: { name: string; code: string }) => api('/departments', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: refreshAll
  });

  const createEmployee = useMutation({
    mutationFn: (data: any) => api('/employees', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: refreshAll
  });

  const updateEmployee = useMutation({
    mutationFn: ({ employeeId, data }: { employeeId: string; data: any }) => api(`/employees/${employeeId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: refreshAll
  });

  const deleteEmployee = useMutation({
    mutationFn: (employeeId: string) => api(`/employees/${employeeId}`, { method: 'DELETE' }),
    onSuccess: refreshAll
  });

  const createTask = useMutation({
    mutationFn: (data: any) => api('/tasks', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: refreshAll
  });

  const updateTask = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: any }) => api(`/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: refreshAll
  });

  const deleteTask = useMutation({
    mutationFn: (taskId: string) => api(`/tasks/${taskId}`, { method: 'DELETE' }),
    onSuccess: refreshAll
  });

  const createProject = useMutation({
    mutationFn: (data: any) => api('/projects', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: refreshAll
  });

  if ([departments, employees, projects, tasks].some((q) => q.isLoading)) return <main className="p-6">Loading...</main>;
  if ([departments, employees, projects, tasks].some((q) => q.error)) return <main className="p-6">Error loading data</main>;

  return <Timeline
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
  />;
}
