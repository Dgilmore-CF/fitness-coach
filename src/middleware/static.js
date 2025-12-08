/**
 * Serve static HTML frontend
 */

export async function serveStatic(c) {
  const path = new URL(c.req.url).pathname;
  
  // Serve index.html for root and all non-API routes
  if (path === '/' || !path.startsWith('/api')) {
    const html = await getIndexHTML();
    return c.html(html);
  }
  
  return c.notFound();
}

async function getIndexHTML() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Fitness Coach</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        :root {
            --primary: #4f46e5;
            --primary-dark: #4338ca;
            --secondary: #10b981;
            --danger: #ef4444;
            --warning: #f59e0b;
            --dark: #1f2937;
            --gray: #6b7280;
            --light: #f3f4f6;
            --white: #ffffff;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: var(--dark);
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: var(--white);
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .header h1 {
            color: var(--primary);
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .user-info {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
        
        .btn-primary {
            background: var(--primary);
            color: var(--white);
        }
        
        .btn-primary:hover {
            background: var(--primary-dark);
            transform: translateY(-2px);
        }
        
        .btn-secondary {
            background: var(--secondary);
            color: var(--white);
        }
        
        .btn-danger {
            background: var(--danger);
            color: var(--white);
        }
        
        .btn-outline {
            background: transparent;
            border: 2px solid var(--primary);
            color: var(--primary);
        }
        
        .card {
            background: var(--white);
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        
        .card h2 {
            margin-bottom: 16px;
            color: var(--primary);
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            border-bottom: 2px solid var(--light);
        }
        
        .tab {
            padding: 12px 24px;
            cursor: pointer;
            border: none;
            background: none;
            font-size: 16px;
            font-weight: 600;
            color: var(--gray);
            border-bottom: 3px solid transparent;
            transition: all 0.3s;
        }
        
        .tab.active {
            color: var(--primary);
            border-bottom-color: var(--primary);
        }
        
        .tab-content {
            display: none;
        }
        
        .tab-content.active {
            display: block;
        }
        
        .form-group {
            margin-bottom: 16px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 6px;
            font-weight: 600;
            color: var(--dark);
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
            width: 100%;
            padding: 10px;
            border: 2px solid var(--light);
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.3s;
        }
        
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: var(--primary);
        }
        
        .timer-display {
            font-size: 48px;
            font-weight: bold;
            text-align: center;
            color: var(--primary);
            margin: 20px 0;
            font-family: 'Courier New', monospace;
        }
        
        .timer-controls {
            display: flex;
            gap: 10px;
            justify-content: center;
        }
        
        .exercise-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        
        .exercise-item {
            padding: 16px;
            border: 2px solid var(--light);
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .exercise-item:hover {
            border-color: var(--primary);
            background: var(--light);
        }
        
        .exercise-item.active {
            border-color: var(--primary);
            background: linear-gradient(135deg, rgba(79, 70, 229, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
        }
        
        .set-tracker {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
            gap: 10px;
            margin-top: 12px;
        }
        
        .set-item {
            padding: 8px;
            border: 2px solid var(--light);
            border-radius: 6px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .set-item.completed {
            background: var(--secondary);
            color: var(--white);
            border-color: var(--secondary);
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-top: 20px;
        }
        
        .stat-card {
            padding: 20px;
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
            color: var(--white);
            border-radius: 12px;
            text-align: center;
        }
        
        .stat-value {
            font-size: 32px;
            font-weight: bold;
            margin: 10px 0;
        }
        
        .stat-label {
            font-size: 14px;
            opacity: 0.9;
        }
        
        .chart-container {
            height: 300px;
            margin-top: 20px;
        }
        
        .body-map {
            max-width: 400px;
            margin: 20px auto;
            position: relative;
        }
        
        .body-map svg {
            width: 100%;
            height: auto;
        }
        
        .muscle-group {
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .muscle-group:hover {
            opacity: 0.7;
        }
        
        .muscle-group.active {
            fill: var(--secondary);
        }
        
        .loading {
            text-align: center;
            padding: 40px;
            color: var(--gray);
        }
        
        .loading i {
            font-size: 48px;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            100% { transform: rotate(360deg); }
        }
        
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 1000;
            align-items: center;
            justify-content: center;
        }
        
        .modal.active {
            display: flex;
        }
        
        .modal-content {
            background: var(--white);
            padding: 30px;
            border-radius: 12px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        
        .modal-close {
            cursor: pointer;
            font-size: 24px;
            color: var(--gray);
        }
        
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 24px;
            background: var(--white);
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.2);
            z-index: 2000;
            display: none;
            align-items: center;
            gap: 12px;
            animation: slideIn 0.3s ease-out;
        }
        
        .notification.active {
            display: flex;
        }
        
        @keyframes slideIn {
            from { transform: translateX(400px); }
            to { transform: translateX(0); }
        }
        
        .hidden {
            display: none !important;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }
            
            .header {
                flex-direction: column;
                gap: 15px;
            }
            
            .stats-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><i class="fas fa-dumbbell"></i> AI Fitness Coach</h1>
            <div class="user-info">
                <span id="userName">Loading...</span>
                <button class="btn btn-outline" onclick="showProfile()">
                    <i class="fas fa-user"></i> Profile
                </button>
            </div>
        </div>

        <div class="tabs">
            <button class="tab active" onclick="switchTab('dashboard')">
                <i class="fas fa-home"></i> Dashboard
            </button>
            <button class="tab" onclick="switchTab('program')">
                <i class="fas fa-list"></i> Program
            </button>
            <button class="tab" onclick="switchTab('workout')">
                <i class="fas fa-dumbbell"></i> Workout
            </button>
            <button class="tab" onclick="switchTab('analytics')">
                <i class="fas fa-chart-line"></i> Analytics
            </button>
            <button class="tab" onclick="switchTab('nutrition')">
                <i class="fas fa-apple-alt"></i> Nutrition
            </button>
        </div>

        <div id="dashboard" class="tab-content active">
            <!-- Dashboard content will be loaded here -->
        </div>

        <div id="program" class="tab-content">
            <!-- Program content will be loaded here -->
        </div>

        <div id="workout" class="tab-content">
            <!-- Workout content will be loaded here -->
        </div>

        <div id="analytics" class="tab-content">
            <!-- Analytics content will be loaded here -->
        </div>

        <div id="nutrition" class="tab-content">
            <!-- Nutrition content will be loaded here -->
        </div>
    </div>

    <div id="modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 id="modalTitle">Modal</h2>
                <span class="modal-close" onclick="closeModal()">&times;</span>
            </div>
            <div id="modalBody"></div>
        </div>
    </div>

    <div id="notification" class="notification">
        <i class="fas fa-check-circle"></i>
        <span id="notificationText"></span>
    </div>

    <script src="/app.js"></script>
</body>
</html>
`;
}
