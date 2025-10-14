# IELTS Test System - Installation Guide

## 🖥️ System Requirements
- Windows 10/11
- Internet connection (for initial setup only)
- 2GB RAM minimum
- 1GB free disk space

## 📋 Installation Steps

### Step 1: Install Node.js (One-time setup)
1. Go to [nodejs.org](https://nodejs.org)
2. Download **LTS version** (recommended)
3. Run installer with default settings
4. Restart computer after installation

### Step 2: Deploy Test System
1. Copy the entire "Innovative Centre MOCK" folder to each PC
2. Place in: `C:\IELTS-Test-System\` (or any location)
3. Double-click `SETUP-AND-RUN.bat`
4. System will automatically:
   - Check Node.js installation
   - Install required packages
   - Start the database server
   - Open the test system in browser

## 🚀 Daily Usage
- **Teachers/Invigilators**: Double-click `SETUP-AND-RUN.bat`
- **Students**: Browser will open automatically
- **To Stop**: Close the command window

## 📁 Folder Structure
```
C:\IELTS-Test-System\
├── SETUP-AND-RUN.bat          ← Double-click this to start
├── local-database-server.js   ← Database server
├── launcher.html               ← Main interface
├── MOCKs\                      ← Test content
├── assets\                     ← CSS, JS, audio files
└── admin\                      ← Admin dashboard
```

## 🔧 Troubleshooting

### "Node.js not found" error:
1. Install Node.js from nodejs.org
2. Restart computer
3. Try running SETUP-AND-RUN.bat again

### "Port already in use" error:
1. Close any existing command windows
2. Restart the computer
3. Run SETUP-AND-RUN.bat again

### Browser doesn't open automatically:
1. Manually open browser
2. Go to: `http://localhost:3002/launcher.html`

## 📊 Data Management
- Test submissions saved locally in database
- Export data via Admin Dashboard
- Automatic sync to Neon database (when internet available)

## 🛠️ Admin Tasks
- Access admin dashboard: `http://localhost:3002/enhanced-admin-dashboard.html`
- Default login: admin/admin123
- Export/import test data
- Monitor student submissions