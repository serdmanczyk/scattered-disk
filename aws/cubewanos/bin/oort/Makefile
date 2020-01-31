
.PHONY: plan
plan:
	terraform plan --var-file config.tfvars --out "terraform.tfplan"

.PHONY: apply
apply:
	terraform apply "terraform.tfplan"

.PHONY: destroy
destroy:
	terraform destroy --var-file config.tfvars

.PHONY: all
all:
	$(MAKE) plan
	$(MAKE) apply
