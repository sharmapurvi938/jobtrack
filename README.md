# JobTrack — Job Application Tracker

## Overview

JobTrack is a React-based web application for organizing and tracking job applications. It provides a centralized dashboard to monitor application statuses, review application statistics, and manage recruitment progress.

## Features

- **Dashboard:** View application statistics and recruitment progress.
- **Application Management:** Add, edit, and delete job application records.
- **Status Tracking:** Track applications through Applied, Assessment, Interview, Offer, and Rejected stages.
- **Search and Filtering:** Find applications using search and status filters.
- **Data Visualization:** View application summaries using charts.
- **Follow-up Reminders:** Review applications that require follow-up.
- **Interview Tracker:** Review upcoming interviews.
- **CSV Import and Export:** Import and export application records.
- **Persistent Storage:** Store application data in the browser using localStorage.

## Technologies Used

- React 19
- JavaScript
- Vite 8
- Recharts 3
- CSS
- Browser localStorage

## Prerequisites

Install Node.js and npm before running the project.

## Installation

Clone or download the project, open a terminal in the project directory, and run:

```bash
npm install
```

## Run the Development Server

```bash
npm run dev
```

Open the local URL printed in the terminal.

## Production Build

Generate the production build using:

```bash
npm run build
```

The generated production files are placed in the `dist` directory.

## Preview the Production Build

```bash
npm run preview
```

## Code Quality Check

Run ESLint using:

```bash
npm run lint
```

## Data Storage

Application records are saved in browser localStorage. The data is associated with the browser and origin used by the application; it is not automatically synchronized across different browsers or devices.

## Future Improvements

- Backend integration and cloud-based data synchronization.
- User authentication and individual accounts.
- More advanced application analytics.
- Automated reminders and notifications.
- Improved production bundle optimization.
