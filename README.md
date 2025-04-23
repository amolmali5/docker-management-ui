# Docker Management UI

A web-based Docker container management application similar to Portainer. This application allows you to monitor and manage Docker containers, view logs, change environment variables, and restart containers.

## Technologies Used

### Frontend
- **Next.js 15** - React framework with server-side rendering and routing
- **React 18** - JavaScript library for building user interfaces
- **TypeScript** - Typed superset of JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Axios** - Promise-based HTTP client
- **React Context API** - For state management
- **React Hook Form** - For form validation and handling

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web application framework
- **Docker Engine API** - For communicating with Docker
- **JSON Web Tokens (JWT)** - For authentication
- **bcrypt** - For password hashing
- **lowdb** - JSON file-based database

### DevOps & Deployment
- **Docker** - For containerization
- **Docker Compose** - For multi-container Docker applications
- **Concurrently** - For running multiple commands concurrently

## Features

- Dashboard with system overview and container status
- Container management (start, stop, restart)
- Container logs viewer
- Environment variable management
- Docker image listing
- System information
- User authentication with role-based access control (admin, write, read)
- User management with ability to create and manage users
- User profile management
- Volume and network management
- Dark mode support
- Container ID display alongside container names
- Detailed port mappings display with host:container/protocol format

## Prerequisites

- Docker installed on your host machine
- Node.js and npm (for development)

## Running in Development Mode

### Quick Start (Recommended)

Start both the frontend and backend with a single command:

```bash
npm run app
```

Alternatively, you can use the provided scripts:

- **Windows**: Double-click `start-app.bat`
- **macOS/Linux**: Run `./start-app.sh` (make it executable first with `chmod +x start-app.sh`)

This will start:
- The Next.js frontend on http://localhost:3000
- The Express backend on http://localhost:3001

### Manual Start

#### 1. Start the Backend Server

```bash
npm run server:dev
```

This will build and start the backend server on port 3001.

#### 2. Start the Frontend Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

#### 3. Or Run Both Simultaneously

```bash
npm run dev:all
```

This is the same as `npm run app`.

## Deploying with Docker

The easiest way to deploy the application is using Docker Compose:

### Quick Start with Docker Compose

**Windows:**
```
double-click docker-start.bat
```

**macOS/Linux:**
```bash
chmod +x docker-start.sh
./docker-start.sh
```

Or manually run:
```bash
docker-compose up -d
```

This will build the Docker image and start the container. The application will be available at:
- Frontend: [http://localhost:3000](http://localhost:3000)
- API: [http://localhost:3001](http://localhost:3001)

### Manual Docker Build

Alternatively, you can build and run the Docker image manually:

```bash
# Build the Docker image
docker build -t docker-management-ui .

# Run the container
docker run -d -p 3001:3001 -p 3000:3000 -v /var/run/docker.sock:/var/run/docker.sock -v docker-management-data:/app/server/data --name docker-management-ui docker-management-ui
```

### Stopping the Docker Container

```bash
docker-compose down
```

Or if you started it manually:
```bash
docker stop docker-management-ui
docker rm docker-management-ui
```

### Running Both Local Development and Docker

The application is designed to work seamlessly in both local development and Docker environments:

- **Local Development**:
  - Frontend: http://localhost:3000
  - Backend API: http://localhost:3001
  - Start the backend: `npm run server:dev`
  - Start the frontend: `npm run dev`

- **Docker Deployment**:
  - Frontend: http://localhost:3000
  - Backend API: http://localhost:3001
  - Start with Docker Compose: `docker-compose up -d`

You can run both environments simultaneously without conflicts, as they use different ports.

### Troubleshooting Network Issues

If you encounter network errors when the frontend tries to connect to the backend:

1. Make sure both the frontend and backend servers are running
2. Check that the backend server is accessible at http://localhost:3001/api/system/info
3. Ensure your browser allows cross-origin requests (CORS)
4. Try clearing your browser cache and reloading the page

## Authentication

### Default Credentials

- Username: `admin`
- Password: `admin`

On first login, you will be prompted to change the default password.

### Database Initialization

The application automatically creates a database file (`server/data/db.json`) with a default admin user if it doesn't exist. This means you don't need to manually set up the database - just start the application and it will handle the initialization process.

### Access Levels

- **Read**: View resources and change own password
- **Write**: Manage resources (containers, volumes, networks)
- **Admin**: Full access including user management

## Security Considerations

This application requires access to the Docker socket (`/var/run/docker.sock`) to communicate with the Docker daemon. This gives the application full control over your Docker environment, so be careful when deploying it in production environments.

## Project Structure

```
├── public/                  # Static files
├── server/                  # Backend server
│   ├── data/                # Database files
│   ├── middleware/          # Express middleware
│   ├── routes/              # API routes
│   ├── db.js                # Database configuration
│   ├── reset-admin.js       # Admin password reset utility
│   └── server.js            # Express server entry point
├── src/                     # Frontend source code
│   ├── app/                 # Next.js app directory
│   │   ├── (auth)/          # Authentication pages
│   │   │   ├── login/       # Login page
│   │   │   └── register/    # Registration page
│   │   ├── (dashboard)/     # Dashboard pages
│   │   │   ├── containers/  # Container management pages
│   │   │   │   └── [id]/    # Container detail pages
│   │   │   ├── dashboard/   # Dashboard overview page
│   │   │   ├── images/      # Image management pages
│   │   │   ├── networks/    # Network management pages
│   │   │   ├── volumes/     # Volume management pages
│   │   │   ├── settings/    # Settings pages
│   │   │   ├── profile/     # User profile page
│   │   │   ├── system/      # System information page
│   │   │   ├── users/       # User management page
│   │   │   └── page.tsx     # Main dashboard page
│   │   ├── components/      # React components
│   │   ├── context/         # React context providers
│   │   ├── hooks/           # Custom React hooks
│   │   └── utils/           # Utility functions
├── .env                     # Environment variables
├── docker-compose.yml       # Docker Compose configuration
├── docker-entrypoint.sh     # Docker entrypoint script

├── docker-start.bat         # Windows script to start Docker
├── docker-start.sh          # Linux/macOS script to start Docker
├── Dockerfile               # Docker configuration
├── next.config.js           # Next.js configuration
├── package.json             # NPM dependencies
├── start-app.bat            # Windows script to start app locally
├── start-app.sh             # Linux/macOS script to start app locally
└── tsconfig.json            # TypeScript configuration
```

## Contributing

Contributions are welcome! Here's how you can contribute to this project:

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature-name`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add some feature'`)
5. Push to the branch (`git push origin feature/your-feature-name`)
6. Open a Pull Request

### Development Guidelines

- Follow the existing code style and structure
- Write clean, maintainable, and testable code
- Update documentation as needed
- Test your changes thoroughly

## License

MIT
