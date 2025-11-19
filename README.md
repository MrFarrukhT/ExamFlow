# Cambridge Test System

## Overview
This is a comprehensive web-based testing application for Cambridge English exams (A1 Movers, A2 Key, B1 Preliminary, B2 First) and IELTS. The system includes:

-   **Test Modules**: Reading, Writing, Listening, and Speaking tests for various levels.
-   **Admin Dashboard**: For managing submissions, answer keys, and scoring.
-   **Timer System**: Automated timer functionality for all test modules.
-   **Mock Tests**: Pre-configured mock tests for practice.

## Getting Started

### Prerequisites
-   Node.js installed

### Installation
1.  Install dependencies:
    ```bash
    npm install
    ```
    (or use `scripts/install-deps.bat` on Windows)

### Running the Application
1.  Start the database server:
    ```bash
    node cambridge-database-server.js
    ```
    (or use `start-database-server.bat`)

2.  Launch the system using the provided batch files in the root directory:
    -   `Launch Cambridge Test System.bat` - Opens the main test interface.
    -   `Launch Cambridge Admin Dashboard.bat` - Opens the admin panel.
    -   `Launch IELTS Test System.bat` - Opens the IELTS test interface.

## Project Structure
-   `admin/`: Admin panel and API routes.
-   `assets/`: CSS, JS, Audio, Images, and other static resources.
-   `Cambridge/`: Core Cambridge test files and mock tests.
-   `MOCKs/`: Additional mock test data.
-   `scripts/`: Utility scripts for setup and maintenance.
