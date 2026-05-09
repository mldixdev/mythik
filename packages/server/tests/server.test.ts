import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { filterFields } from '../src/crud-builder.js';
import { createErrorHandler } from '../src/middleware/error-handler.js';

// Integration tests using a manually wired Express app
// These verify the HTTP layer: routing, status codes, response shapes, field filtering

function createTestApp() {
  const app = express();
  app.use(express.json());

  // Simulate catalog endpoint
  app.get('/api/catalogs/organizations', (_req, res) => {
    res.json([
      { value: 1, label: 'Ministerio de Educación' },
      { value: 2, label: 'Ministerio de Salud' },
    ]);
  });

  // Simulate static catalog
  app.get('/api/catalogs/monthes', (_req, res) => {
    res.json([
      { label: 'Enero', value: '1' },
      { label: 'Febrero', value: '2' },
    ]);
  });

  // Simulate query endpoint with pagination
  app.get('/api/records', (req, res) => {
    const page = parseInt(req.query.page as string) || 0;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    res.json({
      data: [{ id: 1, nombre: 'test' }],
      total: 100,
      page,
      pageSize,
    });
  });

  // Simulate query endpoint with totals
  app.get('/api/records/stats', (_req, res) => {
    res.json({
      data: [{ id: 1 }],
      totals: { 'SUM:allocatedAmount': 50000, 'COUNT:*': 100 },
    });
  });

  // Simulate handler endpoint
  app.post('/api/periodos/:id/copiar', (req, res) => {
    res.json({ copied: 45, periodoId: req.params.id });
  });

  // Simulate CRUD
  app.post('/api/items', (req, res) => {
    const fields = filterFields(req.body, ['name', 'price']);
    if (Object.keys(fields).length === 0) {
      res.status(400).json({ error: { code: 'VALIDATION_FAILED', message: 'No valid fields' } });
      return;
    }
    res.status(201).json({ id: 99, ...fields });
  });

  app.put('/api/items/:id', (req, res) => {
    const fields = filterFields(req.body, ['name', 'price']);
    if (Object.keys(fields).length === 0) {
      res.status(400).json({ error: { code: 'VALIDATION_FAILED', message: 'No valid fields' } });
      return;
    }
    res.json({ id: parseInt(req.params.id), ...fields });
  });

  app.delete('/api/items/:id', (_req, res) => {
    res.status(204).send();
  });

  // Simulate spec serving
  app.get('/api/screens/:id', (req, res) => {
    if (req.params.id === 'task-manager') {
      res.json({ root: 'page', elements: { page: { type: 'box' } } });
      return;
    }
    res.status(404).json({ error: { code: 'NOT_FOUND', message: `Screen "${req.params.id}" not found` } });
  });

  // Simulate validation error
  app.get('/api/error-test', (_req, _res, next) => {
    const err = new Error('Missing field "name"') as Error & { type: string; status: number; details: unknown };
    err.type = 'VALIDATION';
    err.status = 400;
    err.details = { field: 'name' };
    next(err);
  });

  // Error handler
  app.use(createErrorHandler(true));

  return app;
}

describe('Server Integration (supertest)', () => {
  const app = createTestApp();

  it('catalog endpoint returns correct format', async () => {
    const res = await request(app).get('/api/catalogs/organizations');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toHaveProperty('value');
    expect(res.body[0]).toHaveProperty('label');
  });

  it('static catalog returns inline data', async () => {
    const res = await request(app).get('/api/catalogs/monthes');
    expect(res.status).toBe(200);
    expect(res.body[0].label).toBe('Enero');
    expect(res.body[0].value).toBe('1');
  });

  it('query endpoint with pagination returns data + total + page', async () => {
    const res = await request(app).get('/api/records?page=0&pageSize=50');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.total).toBe(100);
    expect(res.body.page).toBe(0);
    expect(res.body.pageSize).toBe(50);
  });

  it('query endpoint with totals returns totals object', async () => {
    const res = await request(app).get('/api/records/stats');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.totals).toBeDefined();
    expect(res.body.totals['SUM:allocatedAmount']).toBe(50000);
    expect(res.body.totals['COUNT:*']).toBe(100);
  });

  it('handler endpoint delegates correctly', async () => {
    const res = await request(app).post('/api/periodos/42/copiar');
    expect(res.status).toBe(200);
    expect(res.body.copied).toBe(45);
    expect(res.body.periodoId).toBe('42');
  });

  it('CRUD POST creates with valid fields', async () => {
    const res = await request(app).post('/api/items').send({ name: 'Widget', price: 10, hacked: 'bad' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Widget');
    expect(res.body.price).toBe(10);
    expect(res.body).not.toHaveProperty('hacked');
  });

  it('CRUD POST rejects empty body', async () => {
    const res = await request(app).post('/api/items').send({ unknown: 'field' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('CRUD PUT updates with valid fields', async () => {
    const res = await request(app).put('/api/items/1').send({ name: 'Updated', price: 20 });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated');
    expect(res.body.id).toBe(1);
  });

  it('CRUD PUT rejects empty body', async () => {
    const res = await request(app).put('/api/items/1').send({ unknown: 'field' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('CRUD DELETE returns 204', async () => {
    const res = await request(app).delete('/api/items/1');
    expect(res.status).toBe(204);
  });

  it('spec serving returns screen spec', async () => {
    const res = await request(app).get('/api/screens/task-manager');
    expect(res.status).toBe(200);
    expect(res.body.root).toBe('page');
  });

  it('spec serving returns 404 for unknown screen', async () => {
    const res = await request(app).get('/api/screens/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('error handler formats validation errors', async () => {
    const res = await request(app).get('/api/error-test');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(res.body.error.message).toBe('Missing field "name"');
    expect(res.body.error.details).toEqual({ field: 'name' });
  });
});
