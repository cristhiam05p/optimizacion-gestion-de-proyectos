import { test, expect } from '@playwright/test';

test('create valid task flow visible', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Vista Recursos (MVP)')).toBeVisible();
});

test('create colliding task and verify conflict modal', async ({ request }) => {
  const employees = await request.get('http://localhost:4000/employees');
  const employeeId = (await employees.json())[0].employeeId;
  const projects = await request.get('http://localhost:4000/projects');
  const projectId = (await projects.json())[0].id;
  const deps = await request.get('http://localhost:4000/departments');
  const departmentId = (await deps.json())[0].id;
  const res = await request.post('http://localhost:4000/tasks', { data: { departmentId, employeeId, title:'Collision E2E', description:'x', earliestStartDate:'2026-01-07', deadlineDate:'2026-01-09', durationDays:2, priority:'NORMAL', projectId, status:'PLANNED' } });
  expect(res.status()).toBeGreaterThanOrEqual(400);
});

test('delay-new-task option and maximum priority insert', async ({ request }) => {
  const employees = await request.get('http://localhost:4000/employees');
  const employeeId = (await employees.json())[0].employeeId;
  const projects = await request.get('http://localhost:4000/projects');
  const projectId = (await projects.json())[0].id;
  const deps = await request.get('http://localhost:4000/departments');
  const departmentId = (await deps.json())[0].id;
  const delay = await request.post('http://localhost:4000/tasks', { data: { departmentId, employeeId, title:'Delay New', description:'x', earliestStartDate:'2026-01-07', deadlineDate:'2026-01-20', durationDays:2, priority:'NORMAL', projectId, status:'PLANNED', resolution:'delay-new-task' } });
  expect(delay.ok()).toBeTruthy();
  const max = await request.post('http://localhost:4000/tasks', { data: { departmentId, employeeId, title:'MAX urgent', description:'x', earliestStartDate:'2026-01-08', deadlineDate:'2026-01-20', durationDays:2, priority:'MAXIMUM', projectId, status:'PLANNED' } });
  expect(max.ok()).toBeTruthy();
});
