# AutoHeal – Cloud Monitoring & Self-Recovery Platform

AutoHeal is a cloud-native application monitoring and incident management platform designed to provide visibility into application health, infrastructure performance and service failures. It combines a centralized dashboard, backend APIs and persistent incident storage to simplify application operations.

The platform uses a containerized architecture, making its components easier to deploy, manage and scale.

## Key Features

- **Service Overview:** Centralized dashboard displaying registered application services, backend connectivity and incident statistics.
- **Infrastructure Monitoring:** Dedicated interface for infrastructure resource utilization and monitoring metrics.
- **Incident Management:** Records application incidents with service association, severity, detection time and resolution status.
- **Backend Health Checks:** Monitors API and database connectivity through a dedicated health endpoint.
- **Persistent Database:** PostgreSQL stores service information, incident records, recovery events and infrastructure metrics.
- **Containerized Deployment:** Docker and Docker Compose run the frontend, backend and database as separate services.
- **Reverse Proxy:** Nginx serves the production frontend and forwards API requests to the backend.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React.js, Vite |
| UI Styling | CSS |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| API Communication | Axios, REST APIs |
| Containerization | Docker |
| Container Orchestration | Docker Compose |
| Web Server / Reverse Proxy | Nginx |
| Version Control | Git, GitHub |

## System Architecture

The application follows a three-tier architecture:

1. **Presentation Layer:** React frontend provides the monitoring dashboard and incident management interface.
2. **Application Layer:** Express.js backend exposes REST APIs, handles application requests and communicates with PostgreSQL.
3. **Data Layer:** PostgreSQL maintains service records, incidents, recovery events and infrastructure metrics.

Nginx serves the frontend and routes `/api` requests to the backend. Docker Compose manages the application containers and their communication.

## Application Modules

### 1. Service Overview
- Displays the total number of registered services.
- Shows open and resolved incident counts.
- Displays backend and database connectivity.
- Lists registered services and recent incidents.

### 2. Infrastructure Monitoring
- Provides a dedicated infrastructure monitoring dashboard.
- Displays monitored service counts and incident statistics.
- Provides the interface for CPU and memory utilization metrics.

### 3. Incident Management
- Displays recorded incidents with their associated services.
- Tracks incident severity and resolution status.
- Stores detection and resolution timestamps.
- Supports resolving incidents through the backend API.

## Database Design

PostgreSQL maintains four primary tables:

| Table | Purpose |
|---|---|
| `services` | Stores registered application services |
| `incidents` | Stores detected incidents and their status |
| `recovery_events` | Stores recovery action records |
| `infrastructure_metrics` | Stores infrastructure metric records |

## Running the Application Locally

### Prerequisites
- Docker Desktop
- Docker Compose
- Git

### 1. Clone the repository

```bash
git clone https://github.com/Spandanchoubey9/autoheal.git
cd autoheal
```

### 2. Configure environment variables

Create a local environment file:

```bash
cp backend/.env.example backend/.env
```

Configure the database credentials in `backend/.env`. Use the same secure password for `DB_PASSWORD` and `POSTGRES_PASSWORD`.

### 3. Start the application

```bash
docker compose up -d --build
```

### 4. Verify container status

```bash
docker compose ps
```

### 5. Access the application

| Component | URL |
|---|---|
| AutoHeal Dashboard | http://localhost:85 |
| Backend Health API | http://localhost:85/api/health |
| Services API | http://localhost:85/api/services |
| Incidents API | http://localhost:85/api/incidents |

### 6. Stop the application

```bash
docker compose down
```

The PostgreSQL data volume is retained when containers are stopped using this command.

## REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Checks backend and database health |
| GET | `/api/services` | Retrieves registered services |
| GET | `/api/incidents` | Retrieves recorded incidents |
| POST | `/api/incidents` | Creates a new incident |
| PATCH | `/api/incidents/:id/resolve` | Marks an incident as resolved |


## Testing and Validation

The application has been validated through:

- Frontend ESLint checks and production builds.
- Docker image builds for the frontend and backend.
- Docker Compose container startup and health checks.
- Backend-to-PostgreSQL connectivity verification.
- API testing through the Nginx reverse proxy.
- Service retrieval and incident creation/resolution testing.
- Verification of persistent database records.


---

**AutoHeal – Cloud Monitoring & Self-Recovery Platform**