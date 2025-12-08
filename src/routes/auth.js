import { Hono } from 'hono';
import { parseJWT } from '../middleware/auth';

const auth = new Hono();

auth.post('/login', async (c) => {
  const jwtToken = c.req.header('Cf-Access-Jwt-Assertion');
  
  if (!jwtToken) {
    return c.json({ error: 'No JWT token provided' }, 401);
  }

  const payload = parseJWT(jwtToken);
  
  if (!payload || !payload.email) {
    return c.json({ error: 'Invalid JWT token' }, 401);
  }

  const db = c.env.DB;
  
  let user = await db.prepare(
    'SELECT * FROM users WHERE email = ?'
  ).bind(payload.email).first();

  if (!user) {
    const result = await db.prepare(
      'INSERT INTO users (email, name) VALUES (?, ?) RETURNING *'
    ).bind(payload.email, payload.name || payload.email).first();
    
    user = result;
  }

  return c.json({ user, token: jwtToken });
});

auth.get('/user', async (c) => {
  const jwtToken = c.req.header('Cf-Access-Jwt-Assertion');
  
  if (!jwtToken) {
    return c.json({ error: 'No JWT token provided' }, 401);
  }

  const payload = parseJWT(jwtToken);
  const db = c.env.DB;
  
  const user = await db.prepare(
    'SELECT * FROM users WHERE email = ?'
  ).bind(payload.email).first();

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({ user });
});

auth.put('/user', async (c) => {
  const jwtToken = c.req.header('Cf-Access-Jwt-Assertion');
  
  if (!jwtToken) {
    return c.json({ error: 'No JWT token provided' }, 401);
  }

  const payload = parseJWT(jwtToken);
  const db = c.env.DB;
  const body = await c.req.json();

  const { age, height_cm, weight_kg, name } = body;

  const user = await db.prepare(
    `UPDATE users 
     SET age = ?, height_cm = ?, weight_kg = ?, name = ?, updated_at = CURRENT_TIMESTAMP 
     WHERE email = ? 
     RETURNING *`
  ).bind(age, height_cm, weight_kg, name, payload.email).first();

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({ user });
});

export default auth;
