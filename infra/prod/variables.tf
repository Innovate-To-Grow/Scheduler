variable "aws_region" {
  type    = string
  default = "us-west-2"
}

variable "app_name" {
  type    = string
  default = "scheduler"
}

variable "environment" {
  type    = string
  default = "prod"
}

variable "image_tag" {
  type        = string
  description = "Docker image tag to deploy"
}

variable "container_port" {
  type    = number
  default = 3000
}

variable "task_cpu" {
  type    = number
  default = 512
}

variable "task_memory" {
  type    = number
  default = 1024
}

variable "desired_count" {
  type    = number
  default = 1
}

variable "github_repository" {
  type        = string
  description = "GitHub repository in owner/repo form"
  default     = ""

  validation {
    condition     = !var.create_github_oidc_resources || var.github_repository != ""
    error_message = "github_repository is required when create_github_oidc_resources is true."
  }
}

variable "ecr_repository_name" {
  type    = string
  default = "scheduler-prod"
}

variable "events_table_name" {
  type    = string
  default = "scheduler-prod-events"
}

variable "participants_table_name" {
  type    = string
  default = "scheduler-prod-participants"
}

variable "weights_table_name" {
  type    = string
  default = "scheduler-prod-weights"
}

variable "health_check_path" {
  type    = string
  default = "/api/health"
}

variable "github_oidc_provider_arn" {
  type    = string
  default = ""
}

variable "create_github_oidc_resources" {
  type    = bool
  default = false
}

variable "availability_zones" {
  type = list(string)
  default = [
    "us-west-2a",
    "us-west-2b",
  ]
}
