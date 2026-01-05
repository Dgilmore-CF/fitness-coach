import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import { 
  generateWorkoutReport, 
  generateReportHTML, 
  getReportPreferences, 
  updateReportPreferences 
} from '../services/email-reports.js';

const reports = new Hono();

// Get email report preferences
reports.get('/preferences', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;

  try {
    const preferences = await getReportPreferences(db, user.id);
    return c.json({ preferences });
  } catch (error) {
    console.error('Error getting report preferences:', error);
    return c.json({ error: 'Failed to get report preferences' }, 500);
  }
});

// Update email report preferences
reports.put('/preferences', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;

  try {
    const body = await c.req.json();
    await updateReportPreferences(db, user.id, body);
    return c.json({ success: true, message: 'Preferences updated' });
  } catch (error) {
    console.error('Error updating report preferences:', error);
    return c.json({ error: 'Failed to update report preferences' }, 500);
  }
});

// Generate and preview a report (for testing/preview)
reports.get('/preview/:period', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;
  const period = c.req.param('period');

  if (!['weekly', 'monthly', 'yearly'].includes(period)) {
    return c.json({ error: 'Invalid period. Use weekly, monthly, or yearly' }, 400);
  }

  try {
    const report = await generateWorkoutReport(db, user.id, period);
    return c.json({ report });
  } catch (error) {
    console.error('Error generating report preview:', error);
    return c.json({ error: 'Failed to generate report: ' + error.message }, 500);
  }
});

// Generate HTML report (for email sending or preview)
reports.get('/html/:period', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;
  const period = c.req.param('period');

  if (!['weekly', 'monthly', 'yearly'].includes(period)) {
    return c.json({ error: 'Invalid period. Use weekly, monthly, or yearly' }, 400);
  }

  try {
    const report = await generateWorkoutReport(db, user.id, period);
    const html = generateReportHTML(report);
    
    // Return as HTML
    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    });
  } catch (error) {
    console.error('Error generating HTML report:', error);
    return c.json({ error: 'Failed to generate report: ' + error.message }, 500);
  }
});

// Send a test report email
reports.post('/send-test/:period', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;
  const period = c.req.param('period');

  if (!['weekly', 'monthly', 'yearly'].includes(period)) {
    return c.json({ error: 'Invalid period. Use weekly, monthly, or yearly' }, 400);
  }

  try {
    // Get user email
    const userData = await db.prepare('SELECT email FROM users WHERE id = ?').bind(user.id).first();
    if (!userData?.email) {
      return c.json({ error: 'No email address found for user' }, 400);
    }

    const report = await generateWorkoutReport(db, user.id, period);
    const html = generateReportHTML(report);
    
    // For now, we'll use a simple approach - the actual email sending
    // would require integration with an email service like SendGrid, Mailgun, etc.
    // Return the HTML and a success message for now
    return c.json({ 
      success: true, 
      message: `Report preview generated for ${userData.email}`,
      note: 'Email sending requires email service integration (SendGrid, Mailgun, etc.)',
      previewUrl: `/api/reports/html/${period}`
    });
  } catch (error) {
    console.error('Error sending test report:', error);
    return c.json({ error: 'Failed to send report: ' + error.message }, 500);
  }
});

export default reports;
