'use client';
import { useQuery } from '@tanstack/react-query';
import { Timeline } from '../components/timeline';
import { api } from '../lib/api';

export default function Page() {
  const departments = useQuery({ queryKey: ['departments'], queryFn: () => api<any[]>('/departments') });
  const employees = useQuery({ queryKey: ['employees'], queryFn: () => api<any[]>('/employees') });
  const projects = useQuery({ queryKey: ['projects'], queryFn: () => api<any[]>('/projects') });
  const tasks = useQuery({ queryKey: ['tasks'], queryFn: () => api<any[]>('/tasks') });

  if ([departments, employees, projects, tasks].some((q) => q.isLoading)) return <main className="p-6">Loading...</main>;
  if ([departments, employees, projects, tasks].some((q) => q.error)) return <main className="p-6">Error loading data</main>;

  return <Timeline departments={departments.data!} employees={employees.data!} projects={projects.data!} tasks={tasks.data!} startDate={new Date().toISOString().slice(0,10)} />;
}
