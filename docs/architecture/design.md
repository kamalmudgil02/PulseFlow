# PulseFlow

## System Architecture and Technical Design

**Document Version:** 1.0  
**Document Status:** DRAFT – Pending Architecture Approval  
**Source PRD:** PulseFlow PRD v1.0  
**PRD Status:** Approved  
**Date:** November 13, 2026

---

# 1. Architecture Overview

## 1.1 Purpose

This document defines the proposed technical architecture of PulseFlow, a multi-tenant SaaS distributed job processing platform.

It translates the approved product requirements into an implementation-oriented technical design.

The architecture must support:

- Secure user and organization management.
- Multi-tenant resource isolation.
- Job submission through REST APIs.
- Queue-based background processing.
- Independently deployable API and worker applications.
- Retry and failure management.
- Delayed and recurring execution.
- Job history and monitoring.
- Horizontal scalability.
- Automated testing and observability.

## 1.2 Architectural Style

PulseFlow will use a **modular monolith with independently deployable applications**.

The platform will initially contain three applications:

1. Web application.
2. API application.
3. Worker application.

These applications will share a common monorepo and infrastructure while maintaining separate runtime responsibilities.

The architecture will avoid unnecessary microservices.

## 1.3 High-Level Architecture

```
flowchart TB
    U[Developer / Organization User]
    APP[Customer Application]

    subgraph PLATFORM["PulseFlow Platform"]
        WEB[Next.js Web Application]
        API[NestJS API Application]
        WORKER[NestJS Worker Application]

        PG[(PostgreSQL)]
        REDIS[(Redis / BullMQ)]

        WEB --> API
        APP --> API
        API --> PG
        API --> REDIS
        REDIS --> WORKER
        WORKER --> PG
        WORKER --> REDIS
    end

    U --> WEB
```

The API handles requests and application operations.

PostgreSQL stores durable application records.

Redis and BullMQ coordinate asynchronous job delivery and execution.

Workers consume and process jobs.

## 1.4 Core Architecture Principles

1. Separation of concerns.
2. Explicit module boundaries.
3. API and worker deployment independence.
4. PostgreSQL as the primary durable application datastore.
5. Redis as queue infrastructure, not the sole source of application truth.
6. Tenant isolation at every resource boundary.
7. At-least-once execution semantics.
8. Idempotent processing wherever duplicate side effects are possible.
9. Observable application behavior.
10. Automated testing at architectural boundaries.

# 2. System Context

## 2.1 External Actors

| Actor                | Responsibility                      |
| -------------------- | ----------------------------------- |
| Individual Developer | Manages personal workspace and jobs |
| Organization Owner   | Manages organizational resources    |
| Organization Member  | Uses authorized platform features   |
| Customer Application | Submits jobs through REST API       |
| Platform Operator    | Monitors platform infrastructure    |

## 2.2 External Systems

| System           | Purpose                                |
| ---------------- | -------------------------------------- |
| PostgreSQL       | Durable application data               |
| Redis            | Queue infrastructure                   |
| Email Provider   | Account verification and notifications |
| Hosting Provider | Application deployment                 |
| Monitoring Stack | Metrics, logs and traces               |

Email provider and hosting provider selection remain open technical decisions.

# 3. Application Architecture

## 3.1 Monorepo Structure

The approved starting structure is:

```
pulseflow/
│
├── apps/
│   ├── web/
│   ├── api/
│   └── worker/
│
├── packages/
│   └── shared/
│
├── docs/
│   ├── product/
│   ├── architecture/
│   ├── database/
│   └── adr/
│
├── .github/
│   └── workflows/
│
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .gitignore
└── README.md
```

The exact package manager and workspace configuration require ADR approval. pnpm is the proposed choice.

## 3.2 Application Responsibilities

### apps/web

Technology:

- Next.js
- React
- TypeScript
- Tailwind CSS

Responsibilities:

- Authentication interface.
- Workspace selection.
- Organization management.
- Project management.
- API key management.
- Queue dashboard.
- Job management.
- Execution history.
- Monitoring dashboard.
- User settings.

The web application must not directly access PostgreSQL or Redis.

All protected operations must pass through the API.

### apps/api

Technology:

- NestJS
- TypeScript
- Prisma ORM

Responsibilities:

- Authentication.
- Authorization.
- Organization management.
- Workspace management.
- Project management.
- API key management.
- Queue management.
- Job submission.
- Job cancellation.
- Retry requests.
- Job status queries.
- Execution history.
- Usage limits.
- API validation.

The API is responsible for enforcing business rules and authorization.

### apps/worker

Technology:

- Node.js
- TypeScript
- NestJS
- BullMQ

Responsibilities:

- Queue consumption.
- Job execution.
- Execution attempt management.
- Failure handling.
- Retry coordination.
- Job completion.
- Worker health monitoring.
- Graceful shutdown.

The worker must operate independently of the web application.

Worker scaling must not require scaling the API.

### packages/shared

Responsibilities:

- Shared TypeScript types.
- API contracts.
- Shared validation schemas.
- Common enums.
- Error contracts.
- Event definitions.
- Reusable constants.

This package must not become a dumping ground for unrelated application logic.

# 4. Backend Module Architecture

The API will be divided into domain-oriented NestJS modules.

Proposed modules:

```
apps/api/src/
│
├── modules/
│   ├── auth/
│   ├── users/
│   ├── workspaces/
│   ├── organizations/
│   ├── memberships/
│   ├── projects/
│   ├── api-keys/
│   ├── queues/
│   ├── jobs/
│   ├── executions/
│   ├── schedules/
│   ├── events/
│   ├── logs/
│   ├── monitoring/
│   └── health/
│
├── common/
│   ├── guards/
│   ├── decorators/
│   ├── filters/
│   ├── interceptors/
│   ├── pipes/
│   └── middleware/
│
├── infrastructure/
│   ├── database/
│   ├── redis/
│   ├── queue/
│   ├── observability/
│   └── security/
│
└── main.ts
```

Each module should have clear responsibilities.

A typical module may contain:

```
jobs/
├── jobs.module.ts
├── jobs.controller.ts
├── jobs.service.ts
├── jobs.repository.ts
├── dto/
├── interfaces/
└── tests/
```

The exact layering and repository abstraction policy will be finalized during implementation planning.

## 4.1 Dependency Direction

Preferred dependency direction:

```
flowchart TB
    C[Controllers]
    A[Application Services]
    D[Domain Logic]
    R[Repository Interfaces]
    I[Infrastructure Implementations]

    C --> A
    A --> D
    A --> R
    I --> R
```

Business logic should not depend directly on framework-specific controllers or Redis implementation details.

Infrastructure implementations should satisfy application-level contracts.

# 5. Worker Architecture

The worker will have a separate application entry point and deployment lifecycle.

Proposed structure:

```
apps/worker/src/
│
├── processors/
│   ├── job.processor.ts
│   ├── scheduled.processor.ts
│   └── notification.processor.ts
│
├── services/
│   ├── execution.service.ts
│   ├── retry.service.ts
│   └── failure.service.ts
│
├── infrastructure/
│   ├── redis/
│   ├── database/
│   └── observability/
│
├── health/
│
└── main.ts
```

The worker will:

1. Initialize configuration.
2. Connect to Redis.
3. Establish database connectivity.
4. Register supported processors.
5. Begin consuming jobs.
6. Track execution attempts.
7. Record outcomes.
8. Recover from supported failures.
9. Shut down gracefully.

## 5.1 Worker Isolation

Worker processes must:

- Have independent deployment configuration.
- Support configurable concurrency.
- Use bounded resource consumption.
- Handle shutdown signals.
- Report health status.
- Avoid exposing internal infrastructure publicly.
- Enforce execution time limits where applicable.

## 5.2 Critical Execution Model Decision

The approved PRD excludes arbitrary customer code execution inside shared workers.

This creates an important product architecture decision.

Possible models:

**Model A: Platform-managed handlers**

PulseFlow executes predefined, platform-controlled job types.

Advantages:

- Easier to secure.
- Simpler worker infrastructure.
- Predictable resource usage.

Limitations:

- Does not provide unrestricted general-purpose customer job execution.

**Model B: Customer-hosted workers**

Customers run their own worker processes and connect to PulseFlow using an authenticated worker protocol.

Advantages:

- Developers can execute their own application code.
- Customer execution environments remain under customer control.
- Better support for general-purpose job processing.

Limitations:

- Requires worker SDKs or protocol documentation.
- Requires worker authentication and lifecycle management.
- Requires heartbeat, leasing and recovery mechanisms.

**Model C: Controlled HTTP execution**

PulseFlow sends jobs to registered customer HTTP endpoints.

Advantages:

- No customer executable code runs inside shared workers.
- Easier initial integration through REST.

Limitations:

- Requires endpoint authentication.
- Introduces network and timeout failure modes.
- Requires secure outbound request controls.

**Recommendation:** Evaluate Model B as the long-term developer-oriented execution model, with Model C as a potential initial integration model.

No model is approved yet. This must be resolved before implementing the execution subsystem.

# 6. Job Processing Architecture

## 6.1 Job Submission Flow

Proposed flow:

1. Customer application sends an HTTP request.
2. API authenticates the API key.
3. API resolves the workspace and project.
4. API validates the payload.
5. API checks idempotency.
6. API persists the job and an outbox event in one database transaction.
7. API returns the accepted job identifier.
8. An outbox dispatcher publishes the event to BullMQ.
9. Worker receives the queued job.
10. Execution lifecycle is tracked.

The transactional outbox is proposed to avoid losing the queue publication when a database transaction succeeds but Redis publishing fails.

```
sequenceDiagram
    participant Client
    participant API
    participant DB as PostgreSQL
    participant O as Outbox Dispatcher
    participant Redis
    participant Worker

    Client->>API: Submit Job
    API->>API: Authenticate and Validate
    API->>DB: Transaction: Job + Outbox
    DB-->>API: Commit
    API-->>Client: Accepted + Job ID

    O->>DB: Read Pending Outbox Events
    O->>Redis: Publish Job
    Redis-->>O: Acknowledgment
    O->>DB: Mark Event Published

    Redis->>Worker: Deliver Job
```

Outbox delivery must be idempotent because dispatchers may publish an event more than once.

## 6.2 Job Lifecycle

Logical lifecycle:

```
stateDiagram-v2
    [*] --> Queued
    [*] --> Scheduled

    Scheduled --> Queued
    Queued --> Active
    Active --> Completed
    Active --> RetryPending
    RetryPending --> Queued
    Active --> Failed
    Queued --> Cancelled
    Scheduled --> Cancelled

    Completed --> [*]
    Failed --> [*]
    Cancelled --> [*]
```

This is a conceptual lifecycle. Actual transition rules, including cancellation during active execution, must be defined in implementation contracts.

## 6.3 Job Execution Flow

1. Worker receives a job.
2. Worker validates the delivery and execution context.
3. Worker checks whether the job is eligible for execution.
4. Worker records the execution attempt.
5. Supported handler executes.
6. Execution result is recorded.
7. Job status is updated.
8. Failure triggers retry evaluation.
9. Terminal failure is recorded when retry limits are exhausted.

## 6.4 Execution Guarantees

The MVP will use at-least-once delivery semantics.

The system must not promise exactly-once execution.

Reasons:

- Workers may crash after performing a side effect but before acknowledging completion.
- Redis and application database state may temporarily diverge.
- Network interruptions may cause uncertain execution outcomes.
- Retried jobs can repeat previously performed operations.

Therefore:

- Handlers should be idempotent.
- Execution attempts must be recorded.
- External side effects should use appropriate idempotency mechanisms.
- Duplicate delivery must not be treated as impossible.

# 7. Queue Architecture

## 7.1 Queue Infrastructure

Proposed technologies:

- Redis
- BullMQ

BullMQ will manage queue delivery, delayed jobs and worker concurrency.

PostgreSQL will maintain durable application records.

## 7.2 Queue Responsibilities

The queue layer will support:

- Job delivery.
- Priority.
- Delayed execution.
- Retry scheduling.
- Worker concurrency.
- Queue pausing.
- Queue monitoring.

## 7.3 Queue Naming

Queue names should be platform-controlled and namespaced.

Proposed pattern:

```
pulseflow:{environment}:{queue-id}
```

Customer-provided queue names must not be allowed to override internal namespace conventions.

## 7.4 Redis Separation

Redis keyspaces and queue namespaces must be designed to avoid collisions.

Redis must not be exposed publicly.

Authentication, network restrictions and resource limits must be enforced.

# 8. Database Integration

PostgreSQL will serve as the primary application datastore.

Prisma will provide database access and migrations.

The database will contain durable records for:

- Users.
- Workspaces.
- Organizations.
- Memberships.
- Projects.
- API keys.
- Queues.
- Jobs.
- Execution attempts.
- Logs.
- Schedules.
- Outbox events.
- Idempotency records.

## 8.1 Data Ownership

Every tenant-owned resource must have an explicit ownership relationship.

Application services must derive tenant scope from authenticated context rather than trusting arbitrary tenant IDs supplied by clients.

## 8.2 Transaction Boundaries

Transactions will be used for:

- Job creation and outbox insertion.
- Idempotency record creation.
- Organization membership changes.
- API key creation and revocation.
- Critical lifecycle persistence operations.

Long-running job execution must not hold open database transactions.

## 8.3 Data Consistency

PostgreSQL and Redis cannot participate in one ordinary atomic transaction.

Therefore, the system must tolerate eventual consistency between durable application records and queue delivery.

The outbox dispatcher, idempotent publishing and reconciliation processes will help maintain consistency.

# 9. API Architecture

## 9.1 API Style

REST API using JSON over HTTPS.

Proposed versioning:

```
/api/v1/
```

## 9.2 API Module Groups

```
/api/v1/auth
/api/v1/users
/api/v1/workspaces
/api/v1/organizations
/api/v1/projects
/api/v1/api-keys
/api/v1/queues
/api/v1/jobs
/api/v1/executions
/api/v1/schedules
/api/v1/monitoring
```

## 9.3 Example Job Submission

Illustrative request:

```
POST /api/v1/jobs
Authorization: Bearer <API_KEY>
Idempotency-Key: <UNIQUE_KEY>
Content-Type: application/json
```

```
{
  "projectId": "project_123",
  "queue": "default",
  "type": "example.task",
  "payload": {
    "recordId": "record_456"
  },
  "options": {
    "priority": 5,
    "attempts": 3,
    "backoff": {
      "type": "exponential",
      "delay": 1000
    }
  }
}
```

Illustrative response:

```
{
  "id": "job_123",
  "status": "queued",
  "createdAt": "2026-11-13T10:00:00.000Z"
}
```

The exact API contract, field names, validation and response codes must be finalized during API design.

## 9.4 API Requirements

- Consistent response formats.
- Input validation.
- Pagination.
- Filtering.
- Rate limiting.
- Structured error responses.
- Request correlation IDs.
- API versioning.
- OpenAPI documentation.

## 9.5 API Authentication

Two distinct authentication contexts:

1. Web users authenticate through a secure user session.
2. Customer applications authenticate using project-scoped API keys.

These contexts must have separate authorization rules.

# 10. Authentication and Authorization Architecture

Proposed authentication components:

- User registration.
- Login.
- Email verification.
- Password reset.
- Secure session management.
- Role-based access control.

## 10.1 Authorization Flow

```
flowchart TD
    R[Incoming Request]
    A[Authenticate]
    C[Resolve User or API Key]
    T[Resolve Tenant Context]
    P[Check Resource Ownership]
    RBAC[Evaluate Permissions]
    E[Execute Operation]
    D[Deny Request]

    R --> A
    A -->|Invalid| D
    A -->|Valid| C
    C --> T
    T --> P
    P -->|Invalid| D
    P -->|Valid| RBAC
    RBAC -->|Denied| D
    RBAC -->|Allowed| E
```

## 10.2 Tenant Isolation

Tenant isolation is a mandatory security boundary.

Rules:

- Every tenant-owned query must be scoped.
- Tenant identifiers must not be trusted directly from request bodies.
- API keys must be bound to the correct project and tenant.
- WebSocket subscriptions must be authorized.
- Background job processing must preserve tenant context.
- Cross-tenant access must be tested explicitly.

PostgreSQL row-level security is an option for additional defense in depth. Its adoption requires a database architecture decision.

# 11. Real-Time Communication

Socket.IO is the proposed technology.

However, the approved PRD places basic polling first for MVP and real-time communication in a subsequent enhancement.

## 11.1 Initial MVP

The web application will retrieve status updates through REST API polling.

Polling intervals and load behavior must be configurable.

## 11.2 Future Enhancement

Socket.IO may be introduced to provide:

- Job lifecycle events.
- Queue status updates.
- Execution notifications.
- Dashboard updates.

Events must be authorized and scoped to the correct tenant.

WebSocket connections must not bypass API authorization.

# 12. Scheduling Architecture

Delayed jobs will be supported through the queue infrastructure.

Recurring jobs are planned for a subsequent release.

The scheduling subsystem must consider:

- Timezone handling.
- Duplicate schedules.
- Schedule cancellation.
- Missed execution windows.
- Retry behavior.
- Worker outages.
- Clock synchronization.

Recurring scheduling should use a durable schedule definition in PostgreSQL and controlled scheduling coordination rather than treating Redis as the only record of scheduled intent.

The final recurring scheduling mechanism remains open.

# 13. Retry and Failure Architecture

Retry decisions will be based on:

- Maximum attempts.
- Backoff strategy.
- Failure category.
- Retry eligibility.
- Execution timeout.
- Terminal failure state.

Proposed strategies:

1. Fixed delay.
2. Exponential backoff.

Illustrative exponential backoff:

```
delay = initialDelay * 2^(attempt - 1)
```

A maximum delay should be applied.

Retry behavior must avoid unlimited loops.

## 13.1 Failure Categories

- Transient infrastructure failures.
- Network failures.
- Application execution failures.
- Validation failures.
- Timeout failures.
- Authorization failures.

Permanent validation and authorization errors should generally not be retried automatically.

## 13.2 Dead-Letter Handling

The future dead-letter subsystem should allow:

- Identification of terminal failures.
- Inspection of failure reasons.
- Manual replay where safe.
- Retention and cleanup.
- Audit history.

# 14. Observability Architecture

Proposed stack:

- OpenTelemetry.
- Structured application logs.
- Metrics collection.
- Grafana visualization.

## 14.1 Logs

Important events:

- API requests.
- Authentication failures.
- Job submissions.
- Job execution starts.
- Job execution completions.
- Job failures.
- Retry attempts.
- Queue errors.
- Worker startup and shutdown.

## 14.2 Metrics

Proposed metrics:

| Metric                 | Purpose               |
| ---------------------- | --------------------- |
| jobs_submitted_total   | Submission volume     |
| jobs_completed_total   | Successful executions |
| jobs_failed_total      | Failed executions     |
| job_execution_duration | Execution latency     |
| queue_wait_duration    | Queue delay           |
| queue_backlog          | Pending work          |
| worker_active_jobs     | Worker utilization    |
| worker_errors_total    | Worker errors         |
| api_request_duration   | API latency           |

Metrics must be designed to avoid unbounded tenant or job identifiers as labels.

## 14.3 Distributed Tracing

Trace context should propagate across:

- Web requests.
- API processing.
- Outbox publishing.
- Queue delivery.
- Worker execution.

Sensitive payload data must not be included in traces.

# 15. Security Architecture

Security requirements include:

- HTTPS for external communication.
- Secure password hashing.
- API key hashing and revocation.
- Session protection.
- RBAC.
- Tenant isolation.
- Input validation.
- Request rate limiting.
- Secure environment configuration.
- Secret rotation.
- Dependency vulnerability scanning.
- Audit logging.
- Database access restrictions.
- Redis network isolation.

## 15.1 API Key Security

API keys must:

- Be generated using cryptographically secure randomness.
- Be displayed only at creation.
- Never be logged in plaintext.
- Be stored using an appropriate one-way hash.
- Support revocation.
- Be scoped to a project.
- Support rate limiting and auditability.

## 15.2 Job Payload Security

Job payloads must be treated as untrusted data.

The platform must:

- Validate payload structure.
- Restrict payload size.
- Avoid logging secrets.
- Avoid exposing sensitive values in error messages.
- Apply retention policies.
- Restrict outbound network execution if HTTP delivery is adopted.

# 16. Testing Architecture

Testing must be organized by responsibility.

## 16.1 Unit Testing

Test:

- Domain logic.
- Retry calculations.
- State transition validation.
- Authorization policies.
- Idempotency logic.
- Input validation.

## 16.2 Integration Testing

Test:

- API and PostgreSQL interactions.
- Prisma repositories.
- Redis queue publishing.
- Worker queue consumption.
- Outbox processing.
- Job lifecycle persistence.

## 16.3 End-to-End Testing

Test:

- User registration.
- Login.
- Organization creation.
- Project creation.
- API key creation.
- Job submission.
- Job execution.
- Failure and retry.
- Job inspection.
- Tenant access restrictions.

## 16.4 Failure Testing

Simulate:

- Redis unavailable.
- Database unavailable.
- Worker crash.
- Duplicate delivery.
- Network interruption.
- Execution timeout.
- Outbox dispatcher failure.

The goal is to demonstrate recovery and data consistency.

# 17. Deployment Architecture

## 17.1 Application Deployment

Three independently deployable runtime applications:

| Application | Deployment                  |
| ----------- | --------------------------- |
| Web         | Web application runtime     |
| API         | Node.js application runtime |
| Worker      | Node.js worker runtime      |

PostgreSQL and Redis will be managed as separate infrastructure services.

## 17.2 Environment Strategy

Initial environments:

- Local development.
- Testing/CI.
- Staging.
- Production.

Each environment must use separate credentials and infrastructure configuration.

## 17.3 Docker Strategy

Docker will be used for:

- Local application development.
- PostgreSQL.
- Redis.
- API runtime.
- Worker runtime.
- Production container packaging where supported.

Docker Compose will provide the initial local development environment.

## 17.4 Deployment Principles

- API and worker deployments must be independent.
- Configuration must be environment-driven.
- Secrets must not be committed.
- Database migrations must be controlled.
- Health checks must be available.
- Deployments should support rollback.
- Graceful shutdown must be implemented.

Hosting provider and production infrastructure selection remain open.

# 18. CI/CD Architecture

GitHub Actions is the proposed CI/CD platform.

Proposed pipeline:

```
flowchart TD
    PUSH[Push / Pull Request]
    INSTALL[Install Dependencies]
    LINT[Lint and Format Checks]
    TYPE[Type Checking]
    UNIT[Unit Tests]
    INTEGRATION[Integration Tests]
    BUILD[Build Applications]
    SECURITY[Dependency and Security Checks]
    MERGE[Merge Approval]
    DEPLOY[Deployment]

    PUSH --> INSTALL
    INSTALL --> LINT
    LINT --> TYPE
    TYPE --> UNIT
    UNIT --> INTEGRATION
    INTEGRATION --> BUILD
    BUILD --> SECURITY
    SECURITY --> MERGE
    MERGE --> DEPLOY
```

Required checks should be enforced before merging changes into the protected main branch.

# 19. Scalability and Reliability

## 19.1 Horizontal Scaling

The API should support multiple instances behind a load balancer.

The worker should support multiple instances consuming from supported queues.

Concurrency must be controlled to avoid overwhelming:

- PostgreSQL.
- Redis.
- External services.
- Worker memory and CPU.

## 19.2 Database Scaling

Initial approach:

- Proper indexing.
- Connection pooling.
- Query optimization.
- Pagination.
- Retention and cleanup.

Read replicas and partitioning may be considered when actual workload justifies them.

## 19.3 Redis Scaling

Redis resource usage must be monitored.

Queue memory growth, persistence, eviction behavior and recovery requirements must be explicitly configured.

Redis eviction must not silently remove data required for queue correctness.

## 19.4 Reliability

The system should support:

- Worker recovery.
- Outbox replay.
- Idempotent publishing.
- Retry coordination.
- Health monitoring.
- Graceful shutdown.
- Database backup and recovery.

# 20. Failure Scenarios and Recovery

| Scenario                        | Expected Behavior                                          |
| ------------------------------- | ---------------------------------------------------------- |
| API crashes before DB commit    | Request fails; no accepted job should be acknowledged      |
| API crashes after DB commit     | Outbox dispatcher can publish later                        |
| Redis unavailable               | Job remains durably recorded; publication is retried       |
| Worker crashes during execution | Delivery may be repeated; handler must tolerate duplicates |
| Database unavailable            | Critical state updates must not be falsely acknowledged    |
| Duplicate outbox event          | Queue publishing must be safe to repeat                    |
| Invalid payload                 | Job rejected before acceptance where validation permits    |
| Maximum retries exhausted       | Job becomes terminally failed                              |
| Worker deployment restart       | Graceful shutdown and queue recovery                       |
| Client disconnects              | Client can query job status using the job ID               |

The system must define how it handles uncertain execution outcomes when a worker performs an external side effect and then crashes before recording success.

# 21. Data Retention and Lifecycle

The database architecture must define retention for:

- Job records.
- Execution attempts.
- Job logs.
- Audit events.
- Idempotency records.
- Outbox events.

Retention policies must not delete records required for active execution or recovery.

The PRD's proposed 30-day job retention period is subject to approval.

# 22. Architectural Trade-offs

| Decision                     | Advantage                            | Trade-off                                |
| ---------------------------- | ------------------------------------ | ---------------------------------------- |
| Modular monolith             | Easier development and maintenance   | Requires disciplined module boundaries   |
| Separate API and worker apps | Independent scaling                  | Additional deployment management         |
| PostgreSQL                   | Strong relational consistency        | Requires query and connection management |
| Redis + BullMQ               | Mature background queue capabilities | Additional infrastructure dependency     |
| Transactional outbox         | Reliable DB-to-queue publishing      | More moving parts                        |
| REST API                     | Broad developer compatibility        | Polling can create additional traffic    |
| At-least-once execution      | Better recovery characteristics      | Requires idempotent handlers             |
| Multi-tenancy                | Supports SaaS organizations          | More complex authorization               |
| Prisma                       | Developer productivity               | Requires migration and query discipline  |

# 23. Open Technical Decisions

The following decisions require explicit review and approval.

| ID       | Decision                       | Proposed Direction                                                            |
| -------- | ------------------------------ | ----------------------------------------------------------------------------- |
| ARCH-001 | Monorepo package manager       | pnpm                                                                          |
| ARCH-002 | Backend modular architecture   | NestJS modules                                                                |
| ARCH-003 | Queue infrastructure           | Redis + BullMQ                                                                |
| ARCH-004 | Primary datastore              | PostgreSQL                                                                    |
| ARCH-005 | ORM                            | Prisma                                                                        |
| ARCH-006 | Job execution model            | Platform-managed handlers for MVP, customer-hosted workers in a future phase. |
| ARCH-007 | Database and Redis consistency | Transactional outbox                                                          |
| ARCH-008 | User authentication            | Secure session-based authentication                                           |
| ARCH-009 | API authentication             | Project-scoped API keys                                                       |
| ARCH-010 | Real-time monitoring           | Polling for MVP; Socket.IO later                                              |
| ARCH-011 | Tenant isolation               | Application-enforced scoping, evaluate RLS                                    |
| ARCH-012 | Recurring scheduling           | Durable schedule definitions                                                  |
| ARCH-013 | Observability                  | OpenTelemetry                                                                 |
| ARCH-014 | CI/CD                          | GitHub Actions                                                                |
| ARCH-015 | Production hosting             | To be selected                                                                |

# 24. Architecture Approval

**Document:** PulseFlow System Architecture  
**Version:** 1.0  
**Status:** DRAFT – Pending Architecture Approval  
**Source:** Approved PRD v1.0

This document establishes the proposed system boundaries, application responsibilities, data flows, queue infrastructure, deployment strategy, security architecture and reliability requirements.

It does not authorize implementation of unresolved architectural decisions.

Approval requires review of the architecture, especially the customer job execution model, consistency strategy and infrastructure choices.

**Approval Record**

- Product: PulseFlow
- Document: system-design.md
- Version: 1.0
- Status: Pending review
- Approved by: Not yet approved
- Approval date: Not applicable

**Next document:** `docs/database/database-design.md`

The database design must use the approved PRD and the subsequently approved architecture as its source of truth.