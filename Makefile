.PHONY: help init install build check clean playground playground-init playground-dev playground-build playground-check playground-clean

NPM ?= npm

help: ## Lista os comandos disponíveis
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

init: ## Instala dependências e builda o pacote de efeitos
	$(NPM) install
	$(MAKE) build

install: ## Instala as dependências do monorepo
	$(NPM) install

build: ## Compila o pacote de efeitos (JS + .d.ts em dist/)
	$(NPM) run build

check: ## Verifica tipos do pacote de efeitos
	$(NPM) run check

clean: ## Remove artefatos de build do pacote
	$(NPM) run clean
	rm -rf .vite

playground-init: ## Prepara o playground (deps + build da lib)
	$(MAKE) -C playground init

playground playground-dev: build ## Sobe o playground (builda a lib antes)
	$(MAKE) -C playground dev

playground-build: build ## Build de produção do playground
	$(MAKE) -C playground build

playground-check: ## Typecheck do playground
	$(MAKE) -C playground check

playground-clean: ## Limpa artefatos do playground
	$(MAKE) -C playground clean
