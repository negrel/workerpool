.PHONY: lint
lint:
	deno lint

.PHONY: fmt
fmt:
	deno fmt

.PHONY: fmt-check
fmt-check:
	deno fmt --check

.PHONY: test
test: lint fmt
	deno test --allow-read

.PHONY: tag
tag/%: test
	jq '.version = "$(@F)"' deno.json | sponge deno.json
	git commit -m "tag version $(@F)" .; \
	git tag $(@F)
