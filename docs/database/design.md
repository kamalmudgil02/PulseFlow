# PulseFlow

## Database Design and Data Modeling

**Document Version:** 1.0  
**Status:** DRAFT – Pending Database Approval  
**Database:** PostgreSQL  
**ORM:** Prisma  
**Source PRD:** Approved PRD v1.0  
**Source Architecture:** Approved System Architecture v1.0  
**Date:** November 13, 2026

---

# 1. Database Architecture Overview

## 1.1 Purpose

This document defines the proposed database architecture for PulseFlow.

The database must support:

- User authentication.
- Personal and organization workspaces.
- Multi-tenant resource ownership.
- Project management.
- API credential management.
- Queue configuration.
- Job submission and lifecycle management.
- Execution attempts.
- Job logs and events.
- Delayed and recurring scheduling.
- Idempotency.
- Transactional outbox processing.
- Audit history.
- Monitoring and analytics.

## 1.2 Database Technology

| Component               | Technology               |
| ----------------------- | ------------------------ |
| Primary database        | PostgreSQL               |
| ORM                     | Prisma                   |
| Database language       | SQL                      |
| Primary data format     | Relational + JSONB       |
| Migration management    | Prisma Migrate           |
| Development environment | Docker                   |
| Database testing        | Test PostgreSQL instance |

PostgreSQL will be the primary source of durable application records.

Redis and BullMQ will manage queue delivery and execution coordination. Redis will not replace PostgreSQL as the authoritative application datastore.

## 1.3 Design Principles

1. Relational integrity.
2. Explicit tenant ownership.
3. Normalization for core business entities.
4. JSONB for flexible job payloads and results.
5. Explicit job lifecycle tracking.
6. Append-only execution history where appropriate.
7. Indexed access patterns.
8. Transactional consistency.
9. Controlled data retention.
10. Version-controlled migrations.

# 2. Database Domain Organization

The database is divided into eight logical domains.

| Domain        | Responsibility                            |
| ------------- | ----------------------------------------- |
| Identity      | Users, sessions and authentication        |
| Tenancy       | Workspaces, organizations and memberships |
| Projects      | Projects and API credentials              |
| Queues        | Queue definitions and configuration       |
| Jobs          | Job records and execution lifecycle       |
| Scheduling    | Delayed and recurring jobs                |
| Reliability   | Idempotency and transactional outbox      |
| Observability | Logs, events and audit records            |

# 3. Entity Relationship Diagram

The following is the proposed logical database model.

```
erDiagram
    USERS ||--o{ WORKSPACE_MEMBERS : belongs_to
    WORKSPACES ||--o{ WORKSPACE_MEMBERS : contains
    WORKSPACES ||--o| ORGANIZATIONS : represents
    WORKSPACES ||--o{ PROJECTS : owns

    USERS ||--o{ AUTH_SESSIONS : has
    USERS ||--o{ ORGANIZATION_INVITATIONS : invites

    PROJECTS ||--o{ API_KEYS : manages
    PROJECTS ||--o{ QUEUES : contains
    PROJECTS ||--o{ JOBS : contains

    QUEUES ||--o{ JOBS : processes

    JOBS ||--o{ JOB_ATTEMPTS : has
    JOBS ||--o{ JOB_LOGS : produces
    JOBS ||--o{ JOB_EVENTS : generates

    PROJECTS ||--o{ JOB_SCHEDULES : owns

    JOBS ||--o{ IDEMPOTENCY_RECORDS : references
    JOBS ||--o{ OUTBOX_EVENTS : generates

    USERS ||--o{ AUDIT_LOGS : performs
    WORKSPACES ||--o{ AUDIT_LOGS : scopes

    USERS {
        uuid id PK
        varchar email UK
        varchar password_hash
        varchar name
        timestamp created_at
        timestamp updated_at
    }

    WORKSPACES {
        uuid id PK
        varchar name
        varchar slug
        varchar type
        timestamp created_at
    }

    ORGANIZATIONS {
        uuid id PK
        uuid workspace_id FK
        varchar name
        timestamp created_at
    }

    WORKSPACE_MEMBERS {
        uuid id PK
        uuid workspace_id FK
        uuid user_id FK
        varchar role
    }

    PROJECTS {
        uuid id PK
        uuid workspace_id FK
        varchar name
        varchar slug
        timestamp created_at
    }

    API_KEYS {
        uuid id PK
        uuid project_id FK
        varchar key_hash
        varchar key_prefix
        timestamp revoked_at
    }

    QUEUES {
        uuid id PK
        uuid project_id FK
        varchar name
        int concurrency
    }

    JOBS {
        uuid id PK
        uuid project_id FK
        uuid queue_id FK
        varchar status
        varchar type
        jsonb payload
        int attempts
        int max_attempts
        timestamp scheduled_at
    }

    JOB_ATTEMPTS {
        uuid id PK
        uuid job_id FK
        int attempt_number
        varchar status
        timestamp started_at
        timestamp completed_at
    }

    JOB_LOGS {
        uuid id PK
        uuid job_id FK
        varchar level
        text message
        timestamp created_at
    }

    JOB_EVENTS {
        uuid id PK
        uuid job_id FK
        varchar event_type
        jsonb metadata
        timestamp created_at
    }

    JOB_SCHEDULES {
        uuid id PK
        uuid project_id FK
        varchar cron_expression
        varchar timezone
        boolean enabled
    }

    IDEMPOTENCY_RECORDS {
        uuid id PK
        uuid project_id FK
        varchar idempotency_key
        uuid job_id FK
    }

    OUTBOX_EVENTS {
        uuid id PK
        varchar event_type
        jsonb payload
        varchar status
        timestamp created_at
    }

    AUDIT_LOGS {
        uuid id PK
        uuid workspace_id FK
        uuid actor_id FK
        varchar action
        jsonb metadata
        timestamp created_at
    }
```

The diagram is a logical overview. The detailed foreign keys, composite constraints and additional fields are specified below.

# 4. Identity Domain

## 4.1 Users

**Table:** users

Purpose: Stores platform user accounts.

| Column            | Type         | Constraints                                 |
| ----------------- | ------------ | ------------------------------------------- |
| id                | UUID         | Primary key                                 |
| email             | VARCHAR(255) | Unique, not null                            |
| password_hash     | TEXT         | Nullable for future external authentication |
| name              | VARCHAR(120) | Not null                                    |
| email_verified_at | TIMESTAMPTZ  | Nullable                                    |
| status            | VARCHAR(30)  | Not null                                    |
| created_at        | TIMESTAMPTZ  | Not null                                    |
| updated_at        | TIMESTAMPTZ  | Not null                                    |

Requirements:

- Email addresses must be normalized before storage.
- Passwords must never be stored in plaintext.
- Password hashing should use Argon2id or another approved secure password hashing algorithm.
- Account status must be validated during authentication.

Proposed statuses:

- ACTIVE
- PENDING_VERIFICATION
- SUSPENDED
- DEACTIVATED

## 4.2 Auth Sessions

**Table:** auth_sessions

Purpose: Manages authenticated web sessions.

| Column             | Type        | Constraints |
| ------------------ | ----------- | ----------- |
| id                 | UUID        | Primary key |
| user_id            | UUID        | Foreign key |
| session_token_hash | TEXT        | Unique      |
| expires_at         | TIMESTAMPTZ | Not null    |
| revoked_at         | TIMESTAMPTZ | Nullable    |
| created_at         | TIMESTAMPTZ | Not null    |
| last_used_at       | TIMESTAMPTZ | Nullable    |

Security:

- Store session token hashes rather than raw session tokens.
- Revoke sessions after logout.
- Expired sessions must not authenticate requests.
- Support session revocation when account security requires it.

## 4.3 Organization Invitations

**Table:** organization_invitations

Purpose: Supports inviting members to an organization.

| Column       | Type         | Constraints          |
| ------------ | ------------ | -------------------- |
| id           | UUID         | Primary key          |
| workspace_id | UUID         | Foreign key          |
| email        | VARCHAR(255) | Not null             |
| role         | VARCHAR(30)  | Not null             |
| token_hash   | TEXT         | Unique               |
| invited_by   | UUID         | Foreign key to users |
| expires_at   | TIMESTAMPTZ  | Not null             |
| accepted_at  | TIMESTAMPTZ  | Nullable             |
| created_at   | TIMESTAMPTZ  | Not null             |

Invitations must expire and must not grant access before successful acceptance.

# 5. Multi-Tenant Domain

## 5.1 Workspaces

**Table:** workspaces

This is the central tenant ownership model.

A workspace represents either:

- A personal developer workspace.
- An organization workspace.

| Column     | Type         | Constraints      |
| ---------- | ------------ | ---------------- |
| id         | UUID         | Primary key      |
| name       | VARCHAR(120) | Not null         |
| slug       | VARCHAR(100) | Not null, unique |
| type       | VARCHAR(30)  | Not null         |
| created_at | TIMESTAMPTZ  | Not null         |
| updated_at | TIMESTAMPTZ  | Not null         |

Workspace types:

- PERSONAL
- ORGANIZATION

Every project belongs to exactly one workspace.

This design allows personal and organizational resources to use the same project, queue and job-management services.

## 5.2 Organizations

**Table:** organizations

Purpose: Stores organization-specific information.

| Column       | Type         | Constraints        |
| ------------ | ------------ | ------------------ |
| id           | UUID         | Primary key        |
| workspace_id | UUID         | Unique foreign key |
| name         | VARCHAR(150) | Not null           |
| created_at   | TIMESTAMPTZ  | Not null           |
| updated_at   | TIMESTAMPTZ  | Not null           |

An organization has exactly one associated organization workspace.

A personal workspace does not require an organization record.

## 5.3 Workspace Members

**Table:** workspace_members

Purpose: Manages user access to workspaces.

| Column       | Type        | Constraints |
| ------------ | ----------- | ----------- |
| id           | UUID        | Primary key |
| workspace_id | UUID        | Foreign key |
| user_id      | UUID        | Foreign key |
| role         | VARCHAR(30) | Not null    |
| joined_at    | TIMESTAMPTZ | Not null    |

Unique constraint:

`(workspace_id, user_id)`

Roles:

- OWNER
- ADMIN
- DEVELOPER
- VIEWER

A personal workspace should have one owner.

Organization workspaces can contain multiple members.

The application must enforce valid role assignments and prevent unauthorized removal or demotion of the last owner.

# 6. Project Domain

## 6.1 Projects

**Table:** projects

Purpose: Groups API credentials, queues and jobs within a workspace.

| Column       | Type         | Constraints |
| ------------ | ------------ | ----------- |
| id           | UUID         | Primary key |
| workspace_id | UUID         | Foreign key |
| name         | VARCHAR(120) | Not null    |
| slug         | VARCHAR(100) | Not null    |
| description  | TEXT         | Nullable    |
| status       | VARCHAR(30)  | Not null    |
| created_at   | TIMESTAMPTZ  | Not null    |
| updated_at   | TIMESTAMPTZ  | Not null    |

Unique constraint:

`(workspace_id, slug)`

Projects must always belong to a workspace.

Projects must not be shared across workspaces.

# 7. API Credential Domain

## 7.1 API Keys

**Table:** api_keys

Purpose: Stores credentials used by customer applications.

| Column       | Type         | Constraints |
| ------------ | ------------ | ----------- |
| id           | UUID         | Primary key |
| project_id   | UUID         | Foreign key |
| name         | VARCHAR(120) | Not null    |
| key_prefix   | VARCHAR(24)  | Not null    |
| key_hash     | TEXT         | Not null    |
| created_by   | UUID         | Foreign key |
| last_used_at | TIMESTAMPTZ  | Nullable    |
| expires_at   | TIMESTAMPTZ  | Nullable    |
| revoked_at   | TIMESTAMPTZ  | Nullable    |
| created_at   | TIMESTAMPTZ  | Not null    |

Security requirements:

- Generate keys using cryptographically secure randomness.
- Display the complete key only once.
- Store a one-way hash of the secret.
- Never log raw credentials.
- Support revocation.
- Support optional expiration.
- Scope keys to projects.

A public key prefix can be used for identifying the credential during lookup without exposing its secret.

# 8. Queue Domain

## 8.1 Queues

**Table:** queues

Purpose: Defines logical queues for projects.

| Column                | Type         | Constraints      |
| --------------------- | ------------ | ---------------- |
| id                    | UUID         | Primary key      |
| project_id            | UUID         | Foreign key      |
| name                  | VARCHAR(100) | Not null         |
| concurrency           | INTEGER      | Positive integer |
| is_paused             | BOOLEAN      | Not null         |
| default_max_attempts  | INTEGER      | Positive integer |
| default_backoff_type  | VARCHAR(30)  | Nullable         |
| default_backoff_delay | INTEGER      | Nullable         |
| created_at            | TIMESTAMPTZ  | Not null         |
| updated_at            | TIMESTAMPTZ  | Not null         |

Unique constraint:

`(project_id, name)`

Queue names must be unique within their project.

A default queue should be created when a project is provisioned.

Queue configuration in PostgreSQL represents the logical application configuration. Redis/BullMQ configuration must be kept consistent with it.

# 9. Job Domain

## 9.1 Jobs

**Table:** jobs

Purpose: Stores the primary record of every submitted background job.

| Column        | Type         | Constraints |
| ------------- | ------------ | ----------- |
| id            | UUID         | Primary key |
| project_id    | UUID         | Foreign key |
| queue_id      | UUID         | Foreign key |
| type          | VARCHAR(150) | Not null    |
| status        | VARCHAR(30)  | Not null    |
| payload       | JSONB        | Not null    |
| priority      | INTEGER      | Not null    |
| attempts      | INTEGER      | Not null    |
| max_attempts  | INTEGER      | Not null    |
| scheduled_at  | TIMESTAMPTZ  | Nullable    |
| started_at    | TIMESTAMPTZ  | Nullable    |
| completed_at  | TIMESTAMPTZ  | Nullable    |
| cancelled_at  | TIMESTAMPTZ  | Nullable    |
| result        | JSONB        | Nullable    |
| error_message | TEXT         | Nullable    |
| created_at    | TIMESTAMPTZ  | Not null    |
| updated_at    | TIMESTAMPTZ  | Not null    |

Additional requirements:

- A job must belong to one project.
- A job must reference a queue belonging to the same project.
- Payloads must contain valid JSON.
- Maximum payload size must be enforced.
- Attempts must never exceed configured execution limits.
- Terminal job states must be handled consistently.

Proposed job statuses:

- QUEUED
- SCHEDULED
- ACTIVE
- RETRY_PENDING
- COMPLETED
- FAILED
- CANCELLED

The database should use an enum or validated equivalent for lifecycle statuses.

## 9.2 Job Attempts

**Table:** job_attempts

Purpose: Records every execution attempt.

| Column         | Type         | Constraints |
| -------------- | ------------ | ----------- |
| id             | UUID         | Primary key |
| job_id         | UUID         | Foreign key |
| attempt_number | INTEGER      | Not null    |
| status         | VARCHAR(30)  | Not null    |
| worker_id      | VARCHAR(150) | Nullable    |
| started_at     | TIMESTAMPTZ  | Not null    |
| completed_at   | TIMESTAMPTZ  | Nullable    |
| duration_ms    | BIGINT       | Nullable    |
| result         | JSONB        | Nullable    |
| error_code     | VARCHAR(100) | Nullable    |
| error_message  | TEXT         | Nullable    |
| created_at     | TIMESTAMPTZ  | Not null    |

Unique constraint:

`(job_id, attempt_number)`

Attempt statuses:

- ACTIVE
- COMPLETED
- FAILED
- TIMED_OUT
- INTERRUPTED

Attempt history must not be overwritten when a job is retried.

The `worker_id` field is an execution identifier for the initial design, not a finalized worker registry model.

## 9.3 Job Events

**Table:** job_events

Purpose: Provides an event history for job lifecycle changes.

| Column     | Type         | Constraints |
| ---------- | ------------ | ----------- |
| id         | UUID         | Primary key |
| job_id     | UUID         | Foreign key |
| event_type | VARCHAR(100) | Not null    |
| metadata   | JSONB        | Nullable    |
| created_at | TIMESTAMPTZ  | Not null    |

Examples:

- JOB_SUBMITTED
- JOB_QUEUED
- JOB_STARTED
- JOB_COMPLETED
- JOB_FAILED
- JOB_RETRY_SCHEDULED
- JOB_CANCELLED

Events should be append-only.

They provide an audit trail of job lifecycle activity.

## 9.4 Job Logs

**Table:** job_logs

Purpose: Stores application-generated execution logs.

| Column     | Type        | Constraints          |
| ---------- | ----------- | -------------------- |
| id         | UUID        | Primary key          |
| job_id     | UUID        | Foreign key          |
| attempt_id | UUID        | Nullable foreign key |
| level      | VARCHAR(20) | Not null             |
| message    | TEXT        | Not null             |
| metadata   | JSONB       | Nullable             |
| created_at | TIMESTAMPTZ | Not null             |

Log levels:

- DEBUG
- INFO
- WARN
- ERROR

Sensitive values must be redacted before persistence.

# 10. Scheduling Domain

## 10.1 Job Schedules

**Table:** job_schedules

Purpose: Stores recurring job definitions.

| Column          | Type         | Constraints |
| --------------- | ------------ | ----------- |
| id              | UUID         | Primary key |
| project_id      | UUID         | Foreign key |
| queue_id        | UUID         | Foreign key |
| name            | VARCHAR(120) | Not null    |
| job_type        | VARCHAR(150) | Not null    |
| payload         | JSONB        | Not null    |
| cron_expression | VARCHAR(120) | Not null    |
| timezone        | VARCHAR(100) | Not null    |
| is_enabled      | BOOLEAN      | Not null    |
| next_run_at     | TIMESTAMPTZ  | Nullable    |
| last_run_at     | TIMESTAMPTZ  | Nullable    |
| created_at      | TIMESTAMPTZ  | Not null    |
| updated_at      | TIMESTAMPTZ  | Not null    |

Recurring scheduling is a P1 capability in the PRD.

The schema is included to establish the future data model. It does not imply that recurring execution must be implemented in the initial MVP.

The scheduling subsystem must prevent duplicate schedule dispatch and handle missed execution windows.

# 11. Reliability Domain

## 11.1 Idempotency Records

**Table:** idempotency_records

Purpose: Prevent duplicate job creation when clients repeat a submission request.

| Column          | Type         | Constraints          |
| --------------- | ------------ | -------------------- |
| id              | UUID         | Primary key          |
| project_id      | UUID         | Foreign key          |
| idempotency_key | VARCHAR(255) | Not null             |
| request_hash    | VARCHAR(128) | Not null             |
| job_id          | UUID         | Nullable foreign key |
| status          | VARCHAR(30)  | Not null             |
| expires_at      | TIMESTAMPTZ  | Not null             |
| created_at      | TIMESTAMPTZ  | Not null             |

Unique constraint:

`(project_id, idempotency_key)`

Behavior:

1. Client submits a request with an idempotency key.
2. API checks whether the key already exists.
3. If it does not exist, the request is registered.
4. Job creation and the idempotency record are committed transactionally.
5. Repeated requests with the same key return the existing job when the request hash matches.
6. Reusing the key with a different request payload returns a conflict response.
7. Expired records can be cleaned up according to retention policy.

The idempotency retention period is configurable.

## 11.2 Transactional Outbox

**Table:** outbox_events

Purpose: Reliably publish application events to Redis/BullMQ.

| Column         | Type         | Constraints |
| -------------- | ------------ | ----------- |
| id             | UUID         | Primary key |
| aggregate_type | VARCHAR(100) | Not null    |
| aggregate_id   | UUID         | Not null    |
| event_type     | VARCHAR(100) | Not null    |
| payload        | JSONB        | Not null    |
| status         | VARCHAR(30)  | Not null    |
| attempts       | INTEGER      | Not null    |
| available_at   | TIMESTAMPTZ  | Not null    |
| published_at   | TIMESTAMPTZ  | Nullable    |
| last_error     | TEXT         | Nullable    |
| created_at     | TIMESTAMPTZ  | Not null    |

Statuses:

- PENDING
- PROCESSING
- PUBLISHED
- FAILED

The API must insert the job and corresponding outbox event in the same database transaction.

A separate dispatcher will:

1. Find available pending events.
2. Claim events safely.
3. Publish to Redis.
4. Record successful publication.
5. Retry failures.
6. Alert on events that remain stuck.

Multiple dispatchers must use safe concurrency control, such as row locking with `FOR UPDATE SKIP LOCKED`.

Publishing may happen more than once, so the consumer must tolerate duplicate delivery.

# 12. Audit Domain

## 12.1 Audit Logs

**Table:** audit_logs

Purpose: Records security-sensitive administrative actions.

| Column        | Type         | Constraints          |
| ------------- | ------------ | -------------------- |
| id            | UUID         | Primary key          |
| workspace_id  | UUID         | Nullable foreign key |
| actor_id      | UUID         | Nullable foreign key |
| action        | VARCHAR(120) | Not null             |
| resource_type | VARCHAR(100) | Not null             |
| resource_id   | UUID         | Nullable             |
| metadata      | JSONB        | Nullable             |
| ip_address    | INET         | Nullable             |
| created_at    | TIMESTAMPTZ  | Not null             |

Examples:

- USER_LOGIN
- API_KEY_CREATED
- API_KEY_REVOKED
- MEMBER_INVITED
- MEMBER_REMOVED
- ROLE_CHANGED
- PROJECT_CREATED
- QUEUE_UPDATED

Audit logs should not contain passwords, raw API keys, session tokens or sensitive job payloads.

# 13. Relationships and Cardinality

| Relationship                   | Cardinality        |
| ------------------------------ | ------------------ |
| User to workspace memberships  | One-to-many        |
| Workspace to members           | One-to-many        |
| Workspace to organization      | One-to-zero-or-one |
| Workspace to projects          | One-to-many        |
| Project to API keys            | One-to-many        |
| Project to queues              | One-to-many        |
| Project to jobs                | One-to-many        |
| Queue to jobs                  | One-to-many        |
| Job to attempts                | One-to-many        |
| Job to events                  | One-to-many        |
| Job to logs                    | One-to-many        |
| Project to schedules           | One-to-many        |
| Project to idempotency records | One-to-many        |
| User to audit records          | One-to-many        |

Cross-project relationships must be prevented using application validation and appropriate database constraints.

# 14. Indexing Strategy

Indexes must support actual query patterns rather than being added indiscriminately.

## 14.1 Users

```
CREATE UNIQUE INDEX users_email_unique
ON users (email);
```

## 14.2 Workspace Memberships

```
CREATE UNIQUE INDEX workspace_members_unique
ON workspace_members (workspace_id, user_id);

CREATE INDEX workspace_members_user_idx
ON workspace_members (user_id);
```

## 14.3 Projects

```
CREATE UNIQUE INDEX projects_workspace_slug_unique
ON projects (workspace_id, slug);
```

## 14.4 API Keys

```
CREATE INDEX api_keys_prefix_idx
ON api_keys (key_prefix);
```

The key prefix is not sufficient for authentication. The stored hash must be verified.

## 14.5 Queues

```
CREATE UNIQUE INDEX queues_project_name_unique
ON queues (project_id, name);
```

## 14.6 Jobs

```
CREATE INDEX jobs_project_status_created_idx
ON jobs (project_id, status, created_at DESC);

CREATE INDEX jobs_queue_status_idx
ON jobs (queue_id, status);

CREATE INDEX jobs_created_at_idx
ON jobs (created_at DESC);

CREATE INDEX jobs_scheduled_at_idx
ON jobs (scheduled_at)
WHERE status = 'SCHEDULED';
```

## 14.7 Job Attempts

```
CREATE UNIQUE INDEX job_attempts_number_unique
ON job_attempts (job_id, attempt_number);

CREATE INDEX job_attempts_job_created_idx
ON job_attempts (job_id, created_at DESC);
```

## 14.8 Logs and Events

```
CREATE INDEX job_logs_job_created_idx
ON job_logs (job_id, created_at DESC);

CREATE INDEX job_events_job_created_idx
ON job_events (job_id, created_at DESC);
```

## 14.9 Outbox

```
CREATE INDEX outbox_pending_idx
ON outbox_events (available_at, created_at)
WHERE status IN ('PENDING', 'FAILED');

CREATE INDEX outbox_aggregate_idx
ON outbox_events (aggregate_type, aggregate_id);
```

## 14.10 Idempotency

```
CREATE UNIQUE INDEX idempotency_project_key_unique
ON idempotency_records (project_id, idempotency_key);

CREATE INDEX idempotency_expiry_idx
ON idempotency_records (expires_at);
```

Index performance must be validated using EXPLAIN ANALYZE against realistic data.

# 15. Data Integrity and Constraints

The database must enforce:

- Primary key uniqueness.
- Foreign key integrity.
- Required fields.
- Unique workspace slugs.
- Unique project slugs within a workspace.
- Unique queue names within a project.
- Unique idempotency keys within a project.
- Unique execution attempt numbers within a job.
- Positive concurrency values.
- Valid retry limits.
- Valid timestamps.
- Valid lifecycle states.

Important cross-resource rules:

- A queue and its job must belong to the same project.
- A project and its workspace must match the authenticated tenant context.
- An organization must reference an organization-type workspace.
- Personal workspaces must not have organization records.
- Only authorized members can access workspace-owned resources.

These cross-resource rules require both application validation and database-level enforcement where practical.

# 16. Multi-Tenant Isolation Strategy

## 16.1 Tenant Ownership

The workspace is the primary tenant boundary.

Ownership chain:

```
Workspace
   |
   +-- Members
   |
   +-- Projects
          |
          +-- API Keys
          |
          +-- Queues
          |
          +-- Jobs
                 |
                 +-- Attempts
                 +-- Events
                 +-- Logs
```

## 16.2 Isolation Rules

1. Every project belongs to one workspace.
2. Every job belongs to one project.
3. Every queue belongs to one project.
4. Every API key belongs to one project.
5. Every authenticated operation must resolve workspace access.
6. Users must not choose arbitrary tenant IDs to bypass access checks.
7. Worker processing must preserve project and tenant context.
8. WebSocket events must enforce tenant authorization.

## 16.3 PostgreSQL Row-Level Security

PostgreSQL RLS is a possible additional security layer.

The initial implementation will use explicit application-level tenant scoping.

RLS adoption should be evaluated before production deployment.

If RLS is adopted, connection-pool context management must be carefully designed to prevent tenant context leakage between pooled connections.

# 17. Transaction Management

Transactions are required for operations that must succeed or fail together.

## 17.1 Job Submission Transaction

```
BEGIN

1. Validate project ownership.
2. Reserve idempotency key.
3. Create job.
4. Create outbox event.
5. Link idempotency record to job.

COMMIT
```

If any required operation fails, the entire transaction must roll back.

## 17.2 Job Execution

Execution must not hold a long-running database transaction open.

Instead:

1. Record the attempt.
2. Perform the work.
3. Persist the outcome.
4. Update the logical job state.
5. Record the lifecycle event.

The execution and database update are not assumed to be atomic with external side effects.

## 17.3 Outbox Publishing

Outbox event claiming must be atomic.

Use row locking or an equivalent concurrency-safe mechanism.

Events should not be marked published before the queue publishing acknowledgment is received.

Duplicate publishing must be tolerated.

# 18. Prisma ORM Design

Prisma will provide type-safe database access.

The schema will be maintained under:

```
apps/api/prisma/
├── schema.prisma
└── migrations/
```

The final migration and deployment ownership model must also account for worker database access.

## 18.1 Prisma Conventions

- UUID primary keys.
- Explicit relation fields.
- Consistent snake_case database mapping.
- `DateTime` for timestamps.
- `Json` for JSONB fields.
- Explicit indexes and unique constraints.
- Referential integrity.
- Version-controlled migrations.

## 18.2 Illustrative Prisma Models

```
enum WorkspaceType {
  PERSONAL
  ORGANIZATION
}

enum WorkspaceRole {
  OWNER
  ADMIN
  DEVELOPER
  VIEWER
}

enum JobStatus {
  QUEUED
  SCHEDULED
  ACTIVE
  RETRY_PENDING
  COMPLETED
  FAILED
  CANCELLED
}

model User {
  id          String @id @default(uuid()) @db.Uuid
  email       String @unique @db.VarChar(255)
  passwordHash String? @map("password_hash")
  name        String @db.VarChar(120)

  memberships WorkspaceMember[]

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("users")
}

model Workspace {
  id   String @id @default(uuid()) @db.Uuid
  name String @db.VarChar(120)
  slug String @unique @db.VarChar(100)
  type WorkspaceType

  members WorkspaceMember[]
  projects Project[]

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("workspaces")
}

model WorkspaceMember {
  id          String @id @default(uuid()) @db.Uuid
  workspaceId String @map("workspace_id") @db.Uuid
  userId      String @map("user_id") @db.Uuid
  role        WorkspaceRole

  workspace Workspace @relation(fields: [workspaceId], references: [id])
  user      User @relation(fields: [userId], references: [id])

  joinedAt DateTime @default(now()) @map("joined_at")

  @@unique([workspaceId, userId])
  @@map("workspace_members")
}

model Project {
  id          String @id @default(uuid()) @db.Uuid
  workspaceId String @map("workspace_id") @db.Uuid
  name        String @db.VarChar(120)
  slug        String @db.VarChar(100)

  workspace Workspace @relation(fields: [workspaceId], references: [id])
  queues Queue[]
  jobs Job[]

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@unique([workspaceId, slug])
  @@map("projects")
}

model Queue {
  id        String @id @default(uuid()) @db.Uuid
  projectId String @map("project_id") @db.Uuid
  name      String @db.VarChar(100)
  concurrency Int @default(1)

  project Project @relation(fields: [projectId], references: [id])
  jobs Job[]

  createdAt DateTime @default(now()) @map("created_at")

  @@unique([projectId, name])
  @@map("queues")
}

model Job {
  id        String @id @default(uuid()) @db.Uuid
  projectId String @map("project_id") @db.Uuid
  queueId   String @map("queue_id") @db.Uuid

  type      String @db.VarChar(150)
  status    JobStatus
  payload   Json
  priority  Int @default(5)
  attempts  Int @default(0)
  maxAttempts Int @default(3)

  scheduledAt DateTime? @map("scheduled_at")
  startedAt   DateTime? @map("started_at")
  completedAt DateTime? @map("completed_at")

  project Project @relation(fields: [projectId], references: [id])
  queue Queue @relation(fields: [queueId], references: [id])

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([projectId, status, createdAt])
  @@index([queueId, status])
  @@map("jobs")
}
```

This is an illustrative core schema excerpt, not the complete production Prisma schema. All remaining models, relations, composite constraints, enums and indexes must be included before implementation.

# 19. Migration Strategy

Prisma Migrate will manage schema changes.

Requirements:

1. Every schema change must have a migration.
2. Migrations must be committed to version control.
3. Migrations must be tested locally.
4. Production migrations must be reviewed.
5. Destructive migrations require explicit review.
6. Existing production data must be preserved during safe migrations.
7. Rollback and forward-recovery procedures must be documented.

Migrations must not be automatically run by every API or worker instance during startup.

A controlled migration step should run as part of deployment.

# 20. Data Retention and Cleanup

Proposed retention policy:

| Data                    | Initial Policy                     |
| ----------------------- | ---------------------------------- |
| Users                   | Retain until account deletion      |
| Workspaces              | Retain until authorized deletion   |
| Jobs                    | Proposed 30 days                   |
| Job attempts            | Proposed 30 days                   |
| Job logs                | Proposed 30 days                   |
| Job events              | Proposed 30 days                   |
| Audit logs              | Longer retention, policy pending   |
| Idempotency records     | Configurable expiration            |
| Published outbox events | Cleanup after safe archival window |
| Sessions                | Expire automatically               |

Retention periods must be configurable where appropriate.

Cleanup must never remove records required by active jobs or recovery processes.

# 21. Query Optimization

Common query patterns:

1. Retrieve projects for a workspace.
2. Retrieve jobs for a project.
3. Filter jobs by status.
4. Retrieve execution attempts for a job.
5. Retrieve logs for a job.
6. Retrieve pending outbox events.
7. Retrieve expired idempotency records.
8. Retrieve active schedules.

Optimization strategy:

- Use indexes for frequently queried fields.
- Avoid unnecessary full-table scans.
- Use cursor-based pagination for large job lists.
- Select only required columns.
- Avoid N+1 queries.
- Use bounded query limits.
- Monitor slow queries.
- Analyze query plans using EXPLAIN ANALYZE.

JSONB indexes should only be added when real JSON payload query requirements justify them.

# 22. Backup and Recovery

PostgreSQL backup strategy should include:

- Automated backups.
- Point-in-time recovery where supported.
- Periodic restore tests.
- Backup encryption.
- Restricted backup access.
- Documented recovery procedures.

Redis persistence and recovery configuration must be designed separately.

The platform must be able to reconcile database job records with queue state after infrastructure recovery.

# 23. Database Security

Required controls:

- Restricted database credentials.
- Separate application roles where practical.
- TLS for database connections.
- Secure credential management.
- No public database exposure.
- Input validation.
- Tenant-scoped data access.
- Backup protection.
- Sensitive log redaction.
- Migration access restrictions.

Database access must be limited to authorized application components.

# 24. Open Database Decisions

| ID     | Decision                       | Proposed Direction                                                 |
| ------ | ------------------------------ | ------------------------------------------------------------------ |
| DB-001 | Primary identifier strategy    | UUID                                                               |
| DB-002 | Workspace model                | Unified personal and organization workspace                        |
| DB-003 | Tenant ownership               | Workspace-based                                                    |
| DB-004 | Primary job storage            | PostgreSQL                                                         |
| DB-005 | Queue storage                  | Redis + BullMQ                                                     |
| DB-006 | Job payload format             | JSONB                                                              |
| DB-007 | Idempotency scope              | Project + key                                                      |
| DB-008 | Event history                  | Append-only job events                                             |
| DB-009 | Execution history              | Separate job attempts                                              |
| DB-010 | Database migrations            | Prisma Migrate                                                     |
| DB-011 | Row-level security             | Evaluate before production                                         |
| DB-012 | Job retention                  | Proposed 30 days                                                   |
| DB-013 | Idempotency retention          | Configurable                                                       |
| DB-014 | Database partitioning          | Defer until workload justifies it                                  |
| DB-015 | Worker registry                | Deferred until the detailed customer-hosted worker execution model |
| DB-016 | Recurring schedule persistence | Durable PostgreSQL records                                         |
| DB-017 | Outbox cleanup                 | Controlled archival and cleanup                                    |
| DB-018 | Composite tenant constraints   | Enforce where practical                                            |

# 25. Database Approval

**Product:** PulseFlow  
**Document:** [database-design.md](http://database-design.md)  
**Version:** 1.0  
**Status:** DRAFT – Pending Database Approval

This document defines the proposed PostgreSQL schema, domain entities, relationships, constraints, indexing strategy, tenant isolation, Prisma conventions, migrations and recovery approach.

The database design must be reviewed against:

- Approved PRD v1.0.
- Approved [system-design.md](http://system-design.md) v1.0.
- Outstanding architecture decisions.

The illustrative Prisma models must be expanded into a complete schema before implementation.

**Approval Record**

- Document: [database-design.md](http://database-design.md)
- Version: 1.0
- Status: Pending review
- Approved by: Not yet approved
- Approval date: Not applicable

**Next phase:** Architecture Decision Records (ADRs).