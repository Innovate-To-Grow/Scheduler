aws_region          = "us-west-2"
app_name            = "scheduler"
environment         = "prod"
ecr_repository_name = "scheduler-prod"
events_table_name   = "scheduler-prod-events"
participants_table_name = "scheduler-prod-participants"
weights_table_name      = "scheduler-prod-weights"

# Set this to your repository, e.g. "your-org/scheduler"
github_repository = "replace-me/repository"

# Optional: use an existing OIDC provider ARN if one already exists in your account.
# github_oidc_provider_arn = "arn:aws:iam::<account-id>:oidc-provider/token.actions.githubusercontent.com"
