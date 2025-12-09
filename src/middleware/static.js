/**
 * Serve static HTML frontend and JavaScript
 */

import frontendJS from '../frontend.js';

export async function serveStatic(c) {
  const path = new URL(c.req.url).pathname;
  
  // Serve index.html for root and all non-API routes
  if (path === '/' || !path.startsWith('/api')) {
    const html = getIndexHTML();
    return c.html(html);
  }
  
  return c.notFound();
}

function getIndexHTML() {
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
            --primary: #2563eb;
            --primary-dark: #1d4ed8;
            --primary-light: #dbeafe;
            --secondary: #059669;
            --secondary-light: #d1fae5;
            --danger: #dc2626;
            --warning: #f59e0b;
            --dark: #111827;
            --gray: #6b7280;
            --gray-light: #9ca3af;
            --light: #f9fafb;
            --border: #e5e7eb;
            --white: #ffffff;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: var(--light);
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
            padding: 24px 32px;
            border-radius: 16px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
            border: 1px solid var(--border);
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .header h1 {
            color: var(--dark);
            font-size: 24px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 12px;
            letter-spacing: -0.025em;
        }
        
        .header h1 i {
            color: var(--primary);
        }
        
        .user-info {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-family: inherit;
        }
        
        .btn-primary {
            background: var(--primary);
            color: var(--white);
        }
        
        .btn-primary:hover {
            background: var(--primary-dark);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
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
            background: var(--white);
            border: 1.5px solid var(--border);
            color: var(--dark);
        }
        
        .btn-outline:hover {
            border-color: var(--primary);
            color: var(--primary);
            background: var(--primary-light);
        }
        
        .card {
            background: var(--white);
            padding: 28px;
            border-radius: 16px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
            border: 1px solid var(--border);
            margin-bottom: 24px;
        }
        
        .card h2 {
            margin-bottom: 20px;
            color: var(--dark);
            font-size: 18px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 10px;
            letter-spacing: -0.025em;
        }
        
        .card h2 i {
            color: var(--primary);
        }
        
        .tabs {
            display: flex;
            gap: 8px;
            margin-bottom: 24px;
            border-bottom: 1px solid var(--border);
            background: var(--white);
            border-radius: 16px 16px 0 0;
            padding: 0 16px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }
        
        .tab {
            padding: 14px 24px;
            cursor: pointer;
            border: none;
            background: none;
            font-size: 15px;
            font-weight: 600;
            color: var(--gray-light);
            border-bottom: 2px solid transparent;
            transition: all 0.2s;
            font-family: inherit;
        }
        
        .tab:hover {
            color: var(--gray);
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
            padding: 12px;
            border: 1.5px solid var(--border);
            border-radius: 10px;
            font-size: 14px;
            transition: all 0.2s;
            font-family: inherit;
            background: var(--white);
        }
        
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px var(--primary-light);
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
            padding: 20px;
            border: 1.5px solid var(--border);
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s;
            background: var(--white);
        }
        
        .exercise-item:hover {
            border-color: var(--primary);
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            transform: translateY(-1px);
        }
        
        .exercise-item.active {
            border-color: var(--primary);
            background: var(--primary-light);
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        
        .set-tracker {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
            gap: 10px;
            margin-top: 12px;
        }
        
        .set-item {
            padding: 10px;
            border: 1.5px solid var(--border);
            border-radius: 8px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s;
            background: var(--white);
            font-size: 13px;
        }
        
        .set-item.completed {
            background: var(--secondary);
            color: var(--white);
            border-color: var(--secondary);
            box-shadow: 0 2px 8px rgba(5, 150, 105, 0.25);
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-top: 20px;
        }
        
        .stat-card {
            padding: 24px;
            background: var(--primary);
            color: var(--white);
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 2px 12px rgba(37, 99, 235, 0.15);
        }
        
        .stat-value {
            font-size: 36px;
            font-weight: 700;
            margin: 12px 0;
            letter-spacing: -0.025em;
        }
        
        .stat-label {
            font-size: 13px;
            font-weight: 500;
            opacity: 0.95;
            text-transform: uppercase;
            letter-spacing: 0.5px;
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
            background: rgba(17, 24, 39, 0.7);
            backdrop-filter: blur(4px);
            z-index: 1000;
            align-items: center;
            justify-content: center;
        }
        
        .modal.active {
            display: flex;
        }
        
        .modal-content {
            background: var(--white);
            padding: 32px;
            border-radius: 20px;
            max-width: 500px;
            width: 90%;
            max-height: 85vh;
            overflow-y: auto;
            box-shadow: 0 20px 50px rgba(0,0,0,0.3);
            border: 1px solid var(--border);
        }
        
        .modal-content.wide {
            max-width: 900px;
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
            top: 24px;
            right: 24px;
            padding: 16px 24px;
            background: var(--white);
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.15);
            border: 1px solid var(--border);
            z-index: 2000;
            display: none;
            align-items: center;
            gap: 12px;
            animation: slideIn 0.3s ease-out;
            font-size: 14px;
            font-weight: 500;
        }
        
        .notification.active {
            display: flex;
        }
        
        @keyframes slideIn {
            from { 
                transform: translateX(400px);
                opacity: 0;
            }
            to { 
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes loading {
            0% {
                width: 0%;
                transform: translateX(0);
            }
            50% {
                width: 100%;
                transform: translateX(0);
            }
            100% {
                width: 100%;
                transform: translateX(100%);
            }
        }
        
        @keyframes pulse {
            0%, 100% {
                opacity: 1;
                transform: scale(1);
            }
            50% {
                opacity: 0.6;
                transform: scale(1.1);
            }
        }
        
        /* Achievement Notification */
        .achievement-notification {
            position: fixed;
            top: 100px;
            right: -500px;
            width: 400px;
            max-width: calc(100vw - 40px);
            background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            transition: right 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            z-index: 10000;
            animation: achievementPulse 2s ease-in-out infinite;
        }
        
        .achievement-notification.show {
            right: 20px;
        }
        
        @keyframes achievementPulse {
            0%, 100% {
                box-shadow: 0 8px 32px rgba(255, 215, 0, 0.3);
            }
            50% {
                box-shadow: 0 8px 32px rgba(255, 215, 0, 0.6);
            }
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
            <button class="tab" onclick="switchTab('achievements')">
                <i class="fas fa-trophy"></i> Achievements
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

        <div id="achievements" class="tab-content">
            <!-- Achievements content will be loaded here -->
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

    <script>
      ${frontendJS}
    </script>
</body>
</html>
`;
}
