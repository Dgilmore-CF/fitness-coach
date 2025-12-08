/**
 * Authentication middleware for Cloudflare Access JWT
 */

export function parseJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload;
  } catch (error) {
    return null;
  }
}

export async function authMiddleware(c, next) {
  // Get JWT from Cloudflare Access header
  const jwtToken = c.req.header('Cf-Access-Jwt-Assertion');
  
  if (!jwtToken) {
    return c.json({ error: 'Unauthorized - No JWT token' }, 401);
  }

  const payload = parseJWT(jwtToken);
  
  if (!payload || !payload.email) {
    return c.json({ error: 'Unauthorized - Invalid JWT' }, 401);
  }

  // Get or create user in database
  const db = c.env.DB;
  
  let user = await db.prepare(
    'SELECT * FROM users WHERE email = ?'
  ).bind(payload.email).first();

  if (!user) {
    // Create new user
    const result = await db.prepare(
      'INSERT INTO users (email, name) VALUES (?, ?) RETURNING *'
    ).bind(payload.email, payload.name || payload.email).first();
    
    user = result;
  }

  // Attach user to context
  c.set('user', user);
  c.set('jwtPayload', payload);

  await next();
}

export function requireAuth(c) {
  const user = c.get('user');
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user;
}
