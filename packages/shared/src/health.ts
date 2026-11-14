export const dependencyStatus = {
  ok: 'ok',
  error: 'error',
} as const;

export type DependencyStatus =
  (typeof dependencyStatus)[keyof typeof dependencyStatus];

export const infrastructureDependencies = ['database', 'redis'] as const;

export type InfrastructureDependency =
  (typeof infrastructureDependencies)[number];

export type InfrastructureChecks = Record<
  InfrastructureDependency,
  DependencyStatus
>;

export type LivenessReport = {
  readonly status: typeof dependencyStatus.ok;
};

export type ReadinessReport = {
  readonly status: DependencyStatus;
  readonly checks: Readonly<InfrastructureChecks>;
};

export function livenessReport(): LivenessReport {
  return { status: dependencyStatus.ok };
}

export function readinessReport(checks: InfrastructureChecks): ReadinessReport {
  const status = infrastructureDependencies.every(
    (dependency) => checks[dependency] === dependencyStatus.ok,
  )
    ? dependencyStatus.ok
    : dependencyStatus.error;

  return {
    status,
    checks: {
      database: checks.database,
      redis: checks.redis,
    },
  };
}
