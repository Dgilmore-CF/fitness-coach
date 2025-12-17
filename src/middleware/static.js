/**
 * Serve static HTML frontend and JavaScript
 */

import frontendJS from '../frontend.js';

export async function serveStatic(c) {
  const path = new URL(c.req.url).pathname;
  
  // Serve index.html for root and all non-API routes
  if (path === '/' || !path.startsWith('/api')) {
    const html = getIndexHTML();
    
    // Add cache control headers to prevent stale content
    c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    c.header('Pragma', 'no-cache');
    c.header('Expires', '0');
    
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
            /* Light Mode Colors */
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
            
            /* Semantic Colors */
            --bg-primary: #ffffff;
            --bg-secondary: #f9fafb;
            --text-primary: #111827;
            --text-secondary: #6b7280;
            --shadow: rgba(0,0,0,0.08);
            --shadow-lg: rgba(0,0,0,0.15);
        }
        
        /* Dark Mode Colors */
        [data-theme="dark"] {
            --primary: #3b82f6;
            --primary-dark: #2563eb;
            --primary-light: #1e3a8a;
            --secondary: #10b981;
            --secondary-light: #064e3b;
            --danger: #ef4444;
            --warning: #f59e0b;
            --dark: #f9fafb;
            --gray: #9ca3af;
            --gray-light: #6b7280;
            --light: #1f2937;
            --border: #374151;
            --white: #111827;
            
            /* Semantic Colors */
            --bg-primary: #111827;
            --bg-secondary: #1f2937;
            --text-primary: #f9fafb;
            --text-secondary: #9ca3af;
            --shadow: rgba(0,0,0,0.3);
            --shadow-lg: rgba(0,0,0,0.5);
        }
        
        /* Auto Dark Mode based on system preference */
        @media (prefers-color-scheme: dark) {
            :root:not([data-theme="light"]) {
                --primary: #3b82f6;
                --primary-dark: #2563eb;
                --primary-light: #1e3a8a;
                --secondary: #10b981;
                --secondary-light: #064e3b;
                --danger: #ef4444;
                --warning: #f59e0b;
                --dark: #f9fafb;
                --gray: #9ca3af;
                --gray-light: #6b7280;
                --light: #1f2937;
                --border: #374151;
                --white: #111827;
                
                --bg-primary: #111827;
                --bg-secondary: #1f2937;
                --text-primary: #f9fafb;
                --text-secondary: #9ca3af;
                --shadow: rgba(0,0,0,0.3);
                --shadow-lg: rgba(0,0,0,0.5);
            }
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: var(--bg-secondary);
            min-height: 100vh;
            color: var(--text-primary);
            transition: background-color 0.3s ease, color 0.3s ease;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: var(--bg-primary);
            padding: 24px 32px;
            border-radius: 16px;
            box-shadow: 0 1px 3px var(--shadow);
            border: 1px solid var(--border);
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
        }
        
        /* Theme Toggle Button */
        .theme-toggle {
            background: var(--light);
            border: 1.5px solid var(--border);
            color: var(--text-primary);
            padding: 10px 16px;
            border-radius: 10px;
            cursor: pointer;
            font-size: 18px;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .theme-toggle:hover {
            background: var(--border);
            transform: scale(1.05);
        }
        
        .theme-toggle i {
            transition: transform 0.3s ease;
        }
        
        .theme-toggle:active i {
            transform: rotate(180deg);
        }
        
        .header h1 {
            color: var(--text-primary);
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
            flex-wrap: wrap;
        }
        
        #userName {
            color: var(--text-primary);
            font-weight: 600;
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
            background: var(--bg-primary);
            padding: 28px;
            border-radius: 16px;
            box-shadow: 0 1px 3px var(--shadow);
            border: 1px solid var(--border);
            margin-bottom: 24px;
            transition: all 0.3s ease;
        }
        
        .card h2 {
            margin-bottom: 20px;
            color: var(--text-primary);
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
            background: var(--bg-primary);
            border-radius: 16px 16px 0 0;
            padding: 0 16px;
            box-shadow: 0 1px 3px var(--shadow);
            overflow-x: auto;
            overflow-y: hidden;
            -webkit-overflow-scrolling: touch;
        }
        
        .tabs::-webkit-scrollbar {
            height: 4px;
        }
        
        .tabs::-webkit-scrollbar-track {
            background: var(--light);
        }
        
        .tabs::-webkit-scrollbar-thumb {
            background: var(--primary);
            border-radius: 2px;
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
        
        /* Mobile Bottom Navigation */
        .mobile-nav {
            display: none;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: var(--bg-primary);
            border-top: 1px solid var(--border);
            padding: 8px 4px;
            padding-bottom: max(8px, env(safe-area-inset-bottom));
            z-index: 1000;
            box-shadow: 0 -2px 10px var(--shadow);
        }
        
        .mobile-nav-inner {
            display: flex;
            justify-content: space-around;
            align-items: center;
            max-width: 600px;
            margin: 0 auto;
        }
        
        .mobile-nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 6px 8px;
            border: none;
            background: none;
            color: var(--gray);
            font-size: 10px;
            cursor: pointer;
            transition: all 0.2s;
            min-width: 50px;
        }
        
        .mobile-nav-item i {
            font-size: 18px;
            margin-bottom: 2px;
        }
        
        .mobile-nav-item.active {
            color: var(--primary);
        }
        
        .mobile-nav-item:hover {
            color: var(--primary);
        }
        
        /* Add padding to container when mobile nav is visible */
        @media (max-width: 480px) {
            .container {
                padding-bottom: 80px;
            }
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
            background: var(--bg-primary);
            color: var(--text-primary);
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
            background: var(--bg-primary);
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
            background: var(--bg-primary);
            font-size: 13px;
            color: var(--text-primary);
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
            background: var(--bg-primary);
            padding: 32px;
            border-radius: 20px;
            max-width: 500px;
            width: 90%;
            max-height: 85vh;
            overflow-y: auto;
            box-shadow: 0 20px 50px var(--shadow-lg);
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
            background: var(--bg-primary);
            border-radius: 12px;
            box-shadow: 0 10px 25px var(--shadow-lg);
            border: 1px solid var(--border);
            z-index: 2000;
            display: none;
            align-items: center;
            gap: 12px;
            animation: slideIn 0.3s ease-out;
            font-size: 14px;
            font-weight: 500;
            color: var(--text-primary);
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
        
        /* Table Styles */
        .table-container {
            overflow-x: auto;
            border-radius: 12px;
            border: 1px solid var(--border);
            background: var(--bg-primary);
            box-shadow: 0 1px 3px var(--shadow);
        }
        
        .data-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            font-size: 14px;
        }
        
        .data-table thead {
            background: var(--light);
            border-bottom: 2px solid var(--border);
        }
        
        .data-table th {
            padding: 16px 20px;
            text-align: left;
            font-weight: 600;
            color: var(--text-primary);
            border-bottom: 2px solid var(--border);
            white-space: nowrap;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .data-table th:first-child {
            padding-left: 24px;
        }
        
        .data-table th:last-child {
            padding-right: 24px;
        }
        
        .data-table tbody tr {
            border-bottom: 1px solid var(--border);
            transition: background-color 0.2s;
        }
        
        .data-table tbody tr:hover {
            background-color: var(--light);
        }
        
        .data-table tbody tr:last-child {
            border-bottom: none;
        }
        
        .data-table td {
            padding: 16px 20px;
            color: var(--text-primary);
            vertical-align: middle;
            border-bottom: 1px solid var(--border);
        }
        
        .data-table td:first-child {
            padding-left: 24px;
            font-weight: 500;
        }
        
        .data-table td:last-child {
            padding-right: 24px;
        }
        
        .data-table tbody tr:last-child td {
            border-bottom: none;
        }
        
        /* Alternating row colors for better readability */
        .data-table tbody tr:nth-child(even) {
            background-color: rgba(249, 250, 251, 0.5);
        }
        
        .data-table tbody tr:nth-child(even):hover {
            background-color: var(--light);
        }
        
        /* Comprehensive Responsive Design */
        
        /* Large Tablets and below (1024px) */
        @media (max-width: 1024px) {
            .container {
                max-width: 100%;
                padding: 16px;
            }
            
            .stats-grid {
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            }
        }
        
        /* Tablets (768px) */
        @media (max-width: 768px) {
            .container {
                padding: 12px;
            }
            
            .header {
                flex-direction: column;
                gap: 12px;
                padding: 20px;
                text-align: center;
            }
            
            .header h1 {
                font-size: 20px;
                justify-content: center;
            }
            
            .user-info {
                justify-content: center;
                width: 100%;
            }
            
            .tabs {
                padding: 0 8px;
                gap: 4px;
                white-space: nowrap;
            }
            
            .tab {
                padding: 12px 16px;
                font-size: 14px;
                flex-shrink: 0;
            }
            
            .card {
                padding: 20px;
            }
            
            .card h2 {
                font-size: 16px;
            }
            
            .stats-grid {
                grid-template-columns: 1fr;
                gap: 12px;
            }
            
            .stat-card {
                padding: 20px;
            }
            
            .stat-value {
                font-size: 28px;
            }
            
            .modal-content {
                padding: 24px;
                width: 95%;
                max-height: 90vh;
            }
            
            .modal-content.wide {
                max-width: 95%;
            }
            
            .btn {
                padding: 10px 16px;
                font-size: 13px;
            }
            
            .data-table th,
            .data-table td {
                padding: 12px 16px;
                font-size: 13px;
            }
            
            .data-table th:first-child,
            .data-table td:first-child {
                padding-left: 16px;
            }
            
            .data-table th:last-child,
            .data-table td:last-child {
                padding-right: 16px;
            }
            
            .set-tracker {
                grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
            }
        }
        
        /* Mobile (480px) */
        @media (max-width: 480px) {
            .container {
                padding: 8px;
            }
            
            .header {
                padding: 16px;
                border-radius: 12px;
                margin-bottom: 16px;
            }
            
            .header h1 {
                font-size: 18px;
                gap: 8px;
            }
            
            .user-info {
                gap: 8px;
                flex-direction: column;
            }
            
            .theme-toggle {
                padding: 8px 12px;
                font-size: 16px;
            }
            
            .tabs {
                border-radius: 12px 12px 0 0;
                margin-bottom: 16px;
            }
            
            .tab {
                padding: 10px 12px;
                font-size: 13px;
            }
            
            .card {
                padding: 16px;
                border-radius: 12px;
                margin-bottom: 16px;
            }
            
            .card h2 {
                font-size: 15px;
                gap: 8px;
            }
            
            .btn {
                padding: 8px 12px;
                font-size: 12px;
                gap: 4px;
            }
            
            .form-group input,
            .form-group select,
            .form-group textarea {
                padding: 10px;
                font-size: 13px;
            }
            
            .modal-content {
                padding: 20px;
                border-radius: 16px;
            }
            
            .notification {
                top: 12px;
                right: 12px;
                left: 12px;
                padding: 12px 16px;
                font-size: 13px;
            }
            
            .exercise-item {
                padding: 16px;
            }
            
            .set-tracker {
                grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
                gap: 8px;
            }
            
            .set-item {
                padding: 8px;
                font-size: 12px;
            }
            
            /* Hide desktop tabs on mobile, show bottom nav */
            .tabs {
                display: none !important;
            }
            
            .mobile-nav {
                display: flex !important;
            }
            
            /* Hide text labels on mobile, show only icons */
            .hide-mobile {
                display: none !important;
            }
            
            .timer-display {
                font-size: 36px;
            }
            
            .stat-value {
                font-size: 24px;
            }
            
            .stat-label {
                font-size: 11px;
            }
            
            /* Make tables scrollable on mobile */
            .table-container {
                overflow-x: scroll;
                -webkit-overflow-scrolling: touch;
            }
            
            .data-table {
                min-width: 600px;
            }
        }
        
        /* Extra Small Mobile (360px) */
        @media (max-width: 360px) {
            .header h1 {
                font-size: 16px;
            }
            
            .tab {
                padding: 8px 10px;
                font-size: 12px;
            }
            
            .btn {
                padding: 6px 10px;
                font-size: 11px;
            }
            
            .stat-value {
                font-size: 20px;
            }
        }
        
        /* Print Styles */
        @media print {
            .header,
            .tabs,
            .btn,
            .modal,
            .notification,
            .theme-toggle {
                display: none !important;
            }
            
            .container {
                max-width: 100%;
                padding: 0;
            }
            
            .card {
                page-break-inside: avoid;
                box-shadow: none;
                border: 1px solid #000;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><i class="fas fa-dumbbell"></i> AI Fitness Coach</h1>
            <div class="user-info">
                <button class="theme-toggle" onclick="toggleTheme()" title="Toggle Dark/Light Mode">
                    <i class="fas fa-moon" id="themeIcon"></i>
                </button>
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
            <button class="tab" onclick="switchTab('insights')">
                <i class="fas fa-brain"></i> AI Insights
            </button>
            <button class="tab" onclick="switchTab('achievements')">
                <i class="fas fa-trophy"></i> Achievements
            </button>
            <button class="tab" onclick="switchTab('nutrition')">
                <i class="fas fa-apple-alt"></i> Nutrition
            </button>
            <button class="tab" onclick="switchTab('learn')">
                <i class="fas fa-graduation-cap"></i> Learn
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

        <div id="insights" class="tab-content">
            <!-- AI Insights content will be loaded here -->
        </div>

        <div id="achievements" class="tab-content">
            <!-- Achievements content will be loaded here -->
        </div>

        <div id="nutrition" class="tab-content">
            <!-- Nutrition content will be loaded here -->
        </div>

        <div id="learn" class="tab-content">
            <!-- Learn content will be loaded here -->
        </div>
    </div>

    <!-- Mobile Bottom Navigation -->
    <nav class="mobile-nav" id="mobileNav">
        <div class="mobile-nav-inner">
            <button class="mobile-nav-item active" onclick="switchTab('dashboard')" data-tab="dashboard">
                <i class="fas fa-home"></i>
                <span>Home</span>
            </button>
            <button class="mobile-nav-item" onclick="switchTab('program')" data-tab="program">
                <i class="fas fa-list"></i>
                <span>Program</span>
            </button>
            <button class="mobile-nav-item" onclick="switchTab('workout')" data-tab="workout">
                <i class="fas fa-dumbbell"></i>
                <span>Workout</span>
            </button>
            <button class="mobile-nav-item" onclick="switchTab('analytics')" data-tab="analytics">
                <i class="fas fa-chart-line"></i>
                <span>Stats</span>
            </button>
            <button class="mobile-nav-item" onclick="showMobileMoreMenu()" data-tab="more">
                <i class="fas fa-ellipsis-h"></i>
                <span>More</span>
            </button>
        </div>
    </nav>

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
