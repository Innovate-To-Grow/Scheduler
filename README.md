# Relevance Weighted Meeting Scheduler

A Next.js 15 application for building weighted meeting schedules.

## Architecture

- Framework: Next.js 15 (App Router)
- Frontend: React 18 + Material Web
- Backend: Next.js Route Handlers (`app/api/**`)
- Database: DynamoDB (`events`, `participants`, `weights` tables)
- Runtime: AWS ECS Fargate behind an ALB

## Local Development

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Run checks:

```bash
npm run lint
npm test
npm run build
```

## Runtime Environment Variables

Application runtime variables:

- `AWS_REGION` (default: `us-west-2`)
- `DDB_EVENTS_TABLE` (default: `scheduler-prod-events`)
- `DDB_PARTICIPANTS_TABLE` (default: `scheduler-prod-participants`)
- `DDB_WEIGHTS_TABLE` (default: `scheduler-prod-weights`)

## Docker

Build image:

```bash
docker build -t scheduler:local .
```

Run container locally:

```bash
docker run --rm -p 3000:3000 \
  -e AWS_REGION=us-west-2 \
  -e DDB_EVENTS_TABLE=scheduler-prod-events \
  -e DDB_PARTICIPANTS_TABLE=scheduler-prod-participants \
  -e DDB_WEIGHTS_TABLE=scheduler-prod-weights \
  scheduler:local
```

## Terraform Infrastructure

### 1. Bootstrap remote Terraform state

Create S3 state bucket + DynamoDB lock table:

```bash
cd infra/bootstrap
terraform init
terraform apply \
  -var="aws_region=us-west-2" \
  -var="state_bucket_name=<your-state-bucket>" \
  -var="lock_table_name=<your-lock-table>"
```

### 2. Deploy production infrastructure

```bash
cd ../prod
terraform init \
  -backend-config="bucket=<your-state-bucket>" \
  -backend-config="dynamodb_table=<your-lock-table>" \
  -backend-config="key=prod/terraform.tfstate" \
  -backend-config="region=us-west-2"

terraform apply \
  -var="aws_region=us-west-2" \
  -var="image_tag=<image-tag>" \
  -var="github_repository=<owner/repo>"
```

Outputs include:

- `alb_dns_name`
- `ecr_repository_url`
- `ecs_cluster_name`
- `ecs_service_name`
- `github_actions_role_arn`

## GitHub CI/CD

Existing CI remains in `.github/workflows/ci.yml` and runs on PR/push to `main`.

New workflows:

- `.github/workflows/infra-plan.yml`: Terraform `fmt/validate/plan` on infra PRs.
- `.github/workflows/deploy-prod.yml`: deploy to ECS on successful CI run for `main`.

### Required GitHub Variables (repo/environment)

Set these in GitHub Actions variables:

- `AWS_REGION` (`us-west-2`)
- `AWS_ROLE_ARN` (OIDC deploy role ARN)
- `TF_STATE_BUCKET`
- `TF_LOCK_TABLE`
- `ECR_REPOSITORY` (`scheduler-prod`)

Use OIDC role assumption only. Do not store static AWS access keys in GitHub secrets.

## One-time SQLite to DynamoDB Migration

If you need to migrate existing SQLite data:

1. Install migration-only dependency:

```bash
npm i -D better-sqlite3
```

2. Run migration script:

```bash
AWS_REGION=us-west-2 \
DDB_EVENTS_TABLE=scheduler-prod-events \
DDB_PARTICIPANTS_TABLE=scheduler-prod-participants \
DDB_WEIGHTS_TABLE=scheduler-prod-weights \
npm run migrate:sqlite-to-dynamodb -- ./data/scheduler.db
```

## Cutover Checklist

1. Freeze writes briefly.
2. Run migration script.
3. Deploy latest ECS task.
4. Verify `/api/health`, event creation, participant updates, and weight updates.
5. Keep SQLite backup for rollback window.
