.PHONY: help init install run dev build check clean preview

NPM ?= npm
ROOT := $(abspath ..)

help: ## Lista os comandos disponíveis
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

init: ## Instala deps do playground e builda o pacote de efeitos
	cd $(ROOT) && $(NPM) install
	cd $(ROOT) && $(NPM) run build
	$(NPM) install
	rm -rf .vite

install: ## Instala dependências do playground (`file:..`)
	$(NPM) install

dev: ## Rebuilda a lib, limpa cache Vite e sobe o servidor
	cd $(ROOT) && $(NPM) run build
	$(NPM) install
	rm -rf .vite
	$(NPM) run dev

run: ## Alias de `make dev`
	$(MAKE) dev

build: ## Build de produção do playground
	cd $(ROOT) && $(NPM) run build
	$(NPM) install
	$(NPM) run build

check: ## Typecheck do playground
	cd $(ROOT) && $(NPM) run build
	$(NPM) install
	$(NPM) run check

preview: ## Serve o build de produção localmente
	$(NPM) run preview

clean: ## Remove artefatos de build e cache do Vite
	$(NPM) run clean
	rm -rf .vite
