# SkyDeploy - High Level System Design

## Overview

SkyDeploy is a modern deployment platform that automatically detects and deploys both static and dynamic web applications from GitHub repositories. The system provides a seamless deployment experience with automatic project type detection, build processes, and continuous deployment capabilities.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                AWS Amplify                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        Frontend (React)                             │    │
│  │  • Deployment Dashboard                                             │    │
│  │  • Real-time Status Monitoring                                      │    │
│  │  • Logs Viewer                                                      │    │
│  │  • Repository Management                                            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Cloudflare                                     │
│  • DNS Management                                                           │
│  • SSL/TLS Termination                                                      │
│  • DDoS Protection                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Single EC2 Instance                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                            Nginx                                     │   │
│  │  • Reverse Proxy (Port 80/443)                                       │   │
│  │  • Load Balancing                                                    │   │
│  │  • SSL Termination                                                   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        Microservices                                 │   │
│  │                                                                      │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐               │   │
│  │  │   CI/CD     │◄──►│   Upload    │◄──►│   Deploy    │               │   │
│  │  │  Service    │    │  Service    │    │  Service    │               │   │
│  │  │  Port:3004  │    │  Port:3001  │    │  Port:3003  │               │   │
│  │  └─────────────┘    └─────────────┘    └─────────────┘               │   │
│  │        │                    │                    │                   │   │
│  │        │                    │                    │                   │   │
│  │        │                    ▼                    │                   │   │
│  │        │            ┌─────────────┐              │                   │   │
│  │        │            │    Redis    │              │                   │   │
│  │        └───────────►│  Port:6379  │◄─────────────┘                   │   │
│  │                     │             │                                  │   │
│  │                     └─────────────┘                                  │   │
│  │                                                                      │   │
│  │                     ┌─────────────┐                                  │   │
│  │                     │   Request   │                                  │   │
│  │                     │  Handler    │                                  │   │
│  │                     │  Port:3002  │                                  │   │
│  │                     └─────────────┘                                  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
┌─────────────────────────┐ ┌─────────────────┐ ┌─────────────────────────┐
│    Cloudflare R2        │ │   Cloudflare    │ │    Cloudflare DNS       │
│  • Object Storage       │ │  • CDN          │ │  • Subdomain Routing    │
│  • Project Files        │ │  • Caching      │ │  • SSL Certificates     │
│  • Build Artifacts      │ │  • Edge Locations│ │  • Health Checks        │
└─────────────────────────┘ └─────────────────┘ └─────────────────────────┘
```

## Core Components

### 1. Frontend (React + TypeScript)
- **Hosting**: AWS Amplify
- **Technology Stack**: React, TypeScript, Vite, Tailwind CSS
- **Key Features**:
  - Deployment dashboard with real-time status updates
  - Repository URL input and validation
  - Deployment history and logs viewer
  - Project type detection display
  - Live deployment URLs with copy functionality

### 2. Upload Service
- **Port**: 3001
- **Responsibilities**:
  - Clone GitHub repositories
  - Detect project type (static vs dynamic)
  - Upload project files to S3
  - Generate unique deployment IDs
  - Queue build requests
  - Track deployment status

### 3. Deploy Service
- **Port**: 3003
- **Responsibilities**:
  - Process build queue from Redis
  - Download project files from S3
  - Execute build processes for Node.js projects
  - Upload build artifacts back to S3
  - Update deployment status
  - Clean up temporary files

### 4. Request Handler
- **Port**: 3002
- **Responsibilities**:
  - Serve deployed applications
  - Handle subdomain routing (`{id}.skydeploy.priyanshu.online`)
  - MIME type detection and proper headers
  - SPA fallback support
  - Static asset caching
  - Error handling and 404 responses

### 5. CI/CD Service
- **Port**: 3004
- **Responsibilities**:
  - Monitor GitHub repositories for changes
  - Poll for new commits
  - Trigger automatic redeployments
  - Handle GitHub API rate limiting
  - Maintain commit hash tracking

### 6. Redis (Message Broker & Cache)
- **Port**: 6379
- **Responsibilities**:
  - Build queue management
  - Deployment status tracking
  - Repository mapping
  - Log message queuing
  - Inter-service communication

### 7. Nginx (Reverse Proxy)
- **Port**: 80/443
- **Responsibilities**:
  - SSL termination and HTTPS handling
  - Request routing to appropriate services
  - Load balancing between service instances
  - Static file serving
  - Health check endpoints
  - Rate limiting and security headers

## Service Communication & Connections

### Inter-Service Communication
```
┌─────────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                        Microservices                     │   │
│  │                                                          │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │   │
│  │  │   CI/CD     │◄──►│   Upload    │◄──►│   Deploy    │   │   │
│  │  │  Service    │    │  Service    │    │  Service    │   │   │
│  │  │  Port:3004  │    │  Port:3001  │    │  Port:3003  │   │   │
│  │  └─────────────┘    └─────────────┘    └─────────────┘   │   │
│  │        │                    │                    │       │   │
│  │        │                    │                    │       │   │
│  │        │                    ▼                    │       │   │
│  │        │            ┌─────────────┐              │       │   │
│  │        │            │    Redis    │              │       │   │
│  │        └───────────►│  Port:6379  │◄─────────────┘       │   │
│  │                     │             │                      │   │
│  │                     └─────────────┘                      │   │
│  │                                                          │   │
│  │                     ┌─────────────┐                      │   │
│  │                     │   Request   │                      │   │
│  │                     │  Handler    │                      │   │
│  │                     │  Port:3002  │                      │   │
│  │                     └─────────────┘                      │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
           
```

### Service Connection Details
- **CI/CD Service** ◄──► **Upload Service**: Bidirectional communication for deployment triggers
- **Upload Service** ◄──► **Deploy Service**: Bidirectional communication for build requests
- **Upload Service** → **Redis**: Stores deployment status and logs
- **Deploy Service** → **Redis**: Updates build status and logs
- **CI/CD Service** → **Redis**: Stores repository mapping and commit hashes
- **Request Handler**: Standalone service, no outgoing connections (only receives requests via Nginx)

### Communication Patterns
- **Redis Pub/Sub**: Status updates, logging, and queue management
- **HTTP APIs**: Direct service-to-service communication
- **Queue-based**: Build requests are queued in Redis for async processing
- **Event-driven**: Status changes trigger notifications across services

## Data Flow

### 1. Initial Deployment Flow
```
User Input → Frontend → Upload Service → R2 → Deploy Service → R2 → Request Handler
     ↓           ↓           ↓         ↓         ↓           ↓         ↓
  GitHub    Validation   Clone Repo  Store    Build Process  Store   Serve App
  Repo URL              Detect Type  Files    (if needed)   Build    via CDN
```

### 2. CI/CD Flow
```
GitHub Repo → CI/CD Service → Upload Service → Deploy Service → Request Handler
     ↓            ↓              ↓              ↓              ↓
  New Commit   Detect Change   Re-deploy     Re-build      Serve Updated
  Pushed       via Polling     Project       Project       Application
```

### 3. Request Serving Flow
```
User Request → Cloudflare DNS → Cloudflare CDN → Nginx → Request Handler → R2 → User
     ↓              ↓              ↓           ↓           ↓        ↓
  Subdomain     DNS Lookup     Route to    Reverse    Fetch from   Serve
  Access        Resolution     Instance    Proxy      R2 Bucket    Content
```

## Infrastructure Components

### AWS Services

#### 1. AWS Amplify
- **Purpose**: Frontend hosting and CI/CD
- **Features**: Automatic deployments, SSL, CDN
- **Benefits**: Zero-config deployment, global edge locations

#### 2. EC2 Instance
- **Purpose**: Single instance hosting all microservices
- **Configuration**: 
  - Nginx reverse proxy (Port 80/443)
  - PM2 process manager for Node.js services
  - Supervisor for service orchestration
- **Services**: Upload, Deploy, Request Handler, CI/CD, Redis
- **Monitoring**: CloudWatch metrics and logs

### Cloudflare Services

#### 1. Cloudflare R2
- **Purpose**: Object storage for project files and build artifacts
- **Structure**:
  ```
  skydeploy-bucket/
  ├── output/{deployment-id}/          # Original project files
  └── build/{deployment-id}/           # Built/processed files
  ```
- **Benefits**: S3-compatible API, global edge locations, cost-effective

#### 2. Cloudflare CDN
- **Purpose**: Global content delivery network
- **Features**: Edge caching, compression, HTTPS, DDoS protection
- **Benefits**: Reduced latency, bandwidth optimization, security

#### 3. Cloudflare DNS
- **Purpose**: DNS management and subdomain routing
- **Pattern**: `{deployment-id}.skydeploy.priyanshu.online`
- **Features**: Health checks, SSL certificates, DDoS protection

### External Services

#### 1. GitHub API
- **Purpose**: Repository access and commit monitoring
- **Rate Limiting**: 5000 requests/hour (with token)
- **Endpoints**: Repository info, commit history

#### 2. Redis
- **Purpose**: Message broker and caching
- **Data Structures**: Lists (queues), Hashes (status), Strings (metadata)

## Security Considerations

### 1. Network Security
- **VPC**: Isolated network environment
- **Security Groups**: Port-specific access control
- **WAF**: Web application firewall for DDoS protection

### 2. Data Security
- **S3 Encryption**: Server-side encryption for stored files
- **HTTPS**: End-to-end encryption for all communications
- **IAM Roles**: Least privilege access for services

### 3. Application Security
- **Input Validation**: Repository URL sanitization
- **Rate Limiting**: API request throttling
- **Error Handling**: Secure error messages

## Scalability Features

### 1. Vertical Scaling
- **EC2 Instance Scaling**: Upgrade instance type for increased capacity
- **Resource Optimization**: Efficient resource utilization across services
- **Microservices**: Independent service scaling within single instance

### 2. Horizontal Scaling (Future)
- **Multi-Instance Deployment**: Distribute services across multiple EC2 instances
- **Load Balancing**: Traffic distribution across instances
- **Service Separation**: Deploy services on dedicated instances

### 2. Performance Optimization
- **CDN**: Global content delivery
- **Caching**: Redis for session and status data
- **Async Processing**: Queue-based build processing

### 3. Resource Management
- **Containerization**: Docker for consistent deployments
- **Process Management**: PM2 for Node.js applications
- **Resource Limits**: Memory and CPU constraints

## Monitoring and Observability

### 1. Application Monitoring
- **CloudWatch**: Metrics, logs, and alarms
- **Health Checks**: Service availability monitoring
- **Error Tracking**: Centralized error logging

### 2. Performance Metrics
- **Response Times**: API endpoint performance
- **Throughput**: Requests per second
- **Resource Utilization**: CPU, memory, disk usage

### 3. Business Metrics
- **Deployment Success Rate**: Build success/failure rates
- **User Activity**: Dashboard usage patterns
- **Repository Types**: Static vs dynamic project distribution

## Disaster Recovery

### 1. Data Backup
- **S3 Versioning**: File version history
- **Cross-region Replication**: Geographic redundancy
- **Redis Persistence**: AOF and RDB snapshots

### 2. Service Recovery
- **Instance Backup**: Regular EC2 instance snapshots
- **Service Restart**: PM2 and Supervisor for automatic service recovery
- **Health Checks**: Nginx health check endpoints
- **Manual Failover**: Quick instance replacement procedures

### 3. Rollback Strategy
- **Previous Deployments**: Keep last N deployments
- **Quick Rollback**: Revert to previous build
- **Emergency Procedures**: Manual intervention protocols

## Cost Optimization

### 1. Resource Optimization
- **Spot Instances**: Cost-effective EC2 instances
- **S3 Lifecycle**: Automatic file cleanup
- **CloudFront**: Reduced bandwidth costs

### 2. Monitoring and Alerts
- **Cost Alerts**: Budget threshold notifications
- **Resource Tracking**: Usage pattern analysis
- **Optimization Recommendations**: AWS Cost Explorer

## Future Enhancements

### 1. Advanced Features
- **Custom Domains**: User-provided domain support
- **Environment Variables**: Runtime configuration
- **Database Support**: Persistent data storage
- **Webhook Integration**: GitHub webhook support

### 2. Platform Expansion
- **Multi-cloud Support**: Azure, GCP integration
- **Container Support**: Docker and Kubernetes
- **Serverless Functions**: AWS Lambda integration
- **Monitoring Dashboard**: Advanced analytics

### 3. Developer Experience
- **CLI Tool**: Command-line interface
- **API Documentation**: OpenAPI/Swagger specs
- **SDK Libraries**: Language-specific clients
- **Templates**: Pre-built project templates

## Conclusion

SkyDeploy provides a robust, scalable platform for automated web application deployment with a focus on simplicity, reliability, and performance. The microservices architecture ensures high availability and easy maintenance, while the AWS infrastructure provides enterprise-grade security and scalability.

The system successfully handles both static and dynamic projects with minimal user intervention, making it an ideal solution for developers looking to streamline their deployment processes. 