# Declares input variables for Supabase configuration (URL, publishable key, and secret key) passed to ECS tasks.

variable "supabase_url" {
  type = string
}
variable "supabase_publishable_key" {
  type = string
}
variable "supabase_secret_key" {
  type      = string
  sensitive = true
}
