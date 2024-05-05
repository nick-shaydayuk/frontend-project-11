install:
	npm install

start:
	npx webpack serve

build:
	npm run build

test:
	npm test -s

test-coverage:
	npm test -- --coverage

lint:
	npx eslint .
