output "alb_dns_name" {
  value = aws_lb.app.dns_name
}

output "ecr_repository_url" {
  value = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${var.ecr_repository_name}"
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.app.name
}

output "ecs_service_name" {
  value = aws_ecs_service.app.name
}

output "custom_domain" {
  value = var.custom_domain
}

output "https_url" {
  value = var.enable_https ? "https://${var.custom_domain}" : ""
}

output "acm_certificate_arn" {
  value = var.enable_https ? local.https_certificate_arn : ""
}

output "github_actions_role_arn" {
  value = var.create_github_oidc_resources ? aws_iam_role.github_actions_deploy[0].arn : ""
}
