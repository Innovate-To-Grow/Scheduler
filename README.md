# Scheduler

A group meeting scheduler with weighted availability and real-time aggregation. Create an event, share the link, and find the best time for everyone.

![Scheduler Screenshot](Screenshoot.png)

## How to Use

### 1. Create an Event

Go to the home page and fill out the event form:

- **Event Name** — give your meeting a title
- **Organizer Password** — secures access to the organizer dashboard
- **Meeting Type** — In-Person (requires a location) or Virtual
- **Time Range** — set the start and end hours to consider
- **Days** — pick which days of the week are options (defaults to Mon–Fri)

After creating, you'll be redirected to the organizer dashboard.

### 2. Share the Link

Click **Copy Share Link** in the top-right corner to get a link like:

```
https://yoursite.com/event?code=j9eaFNJH
```

Send this to everyone who should participate. No account or sign-up needed.

### 3. Participants Fill In Availability

Each participant:

1. Enters their name and clicks **Join**
2. Uses the **Availability Slider** to pick a level (0 = Busy, 1 = Free, with 0.25 steps)
3. Clicks and drags on the **schedule grid** to paint time slots with that availability level
4. Clicks **Submit Schedule** when done

The grid uses color coding: red (busy) → yellow (partial) → green (free).

After submitting, participants can see the **Group Availability** table showing aggregated scores, plus each person's **Individual Schedule** below it.

### 4. Organizer Dashboard

Access the organizer view by appending `&manage=<password>` to the event URL. The organizer can:

- **Set their own availability** on the same grid
- **Adjust participant weights** (0.0–1.0) — higher weight means more influence on the group average
- **Include/exclude participants** from the aggregate calculation
- **Remove participants** from the event
- **View the weighted group average** in real time, updated as weights change

The weighted average formula: for each time slot, `sum(availability × weight) / sum(weights)` across all included participants.

## Tech Stack

| Layer          | Technology                                                                           |
| -------------- | ------------------------------------------------------------------------------------ |
| Framework      | [Next.js 15](https://nextjs.org/) (App Router)                                       |
| Frontend       | React 18 + [Material Web](https://github.com/nicholasgasior/material-web) components |
| Backend        | Next.js Route Handlers (`app/api/`)                                                  |
| Database       | [DynamoDB](https://aws.amazon.com/dynamodb/) (events, participants, weights tables)  |
| Infrastructure | AWS ECS Fargate behind an ALB                                                        |
| IaC            | Terraform (S3 remote state + DynamoDB lock)                                          |
| CI/CD          | GitHub Actions (lint, test, build, Docker build check, deploy)                       |

## Local Development

```bash
npm install          # install dependencies
npm run dev          # start dev server on http://localhost:3000
```

Run checks:

```bash
npm run lint         # ESLint
npm run format:check # Prettier
npm test             # Jest (62 tests)
npm run build        # production build
```

## Runtime Environment Variables

- `AWS_REGION` (default: `us-west-2`)
- `DDB_EVENTS_TABLE` (default: `scheduler-prod-events`)
- `DDB_PARTICIPANTS_TABLE` (default: `scheduler-prod-participants`)
- `DDB_WEIGHTS_TABLE` (default: `scheduler-prod-weights`)

## Docker

```bash
docker build -t scheduler:local .

docker run --rm -p 3000:3000 \
  -e AWS_REGION=us-west-2 \
  -e DDB_EVENTS_TABLE=scheduler-prod-events \
  -e DDB_PARTICIPANTS_TABLE=scheduler-prod-participants \
  -e DDB_WEIGHTS_TABLE=scheduler-prod-weights \
  scheduler:local
```

## Deployment

### 1. Bootstrap Terraform State

```bash
cd infra/bootstrap
terraform init
terraform apply \
  -var="aws_region=us-west-2" \
  -var="state_bucket_name=<your-state-bucket>" \
  -var="lock_table_name=<your-lock-table>"
```

### 2. Deploy Production Infrastructure

```bash
cd infra/prod
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

### GitHub Actions Variables

Set these in your repo's GitHub Actions settings:

- `AWS_REGION` — `us-west-2`
- `AWS_ROLE_ARN` — OIDC deploy role ARN
- `TF_STATE_BUCKET`
- `TF_LOCK_TABLE`
- `ECR_REPOSITORY` — `scheduler-prod`

### GitHub Actions Workflows

- `CI` runs `Lint & Format`, `Test & Build`, and `Docker Build Check` on pull requests and pushes to `main`.
- `AWS ECS - Prod` runs after successful `CI` on `main`, then builds and pushes the image, applies Terraform, waits for ECS stability, and runs smoke tests.

Uses OIDC role assumption (no static AWS keys).
