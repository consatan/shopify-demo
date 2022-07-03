# Shopify code challenge

[![CI](https://github.com/consatan/shopify-demo/actions/workflows/ci.yml/badge.svg)](https://github.com/consatan/shopify-demo/actions/workflows/ci.yml)
[![Coverage Status](https://coveralls.io/repos/github/consatan/shopify-demo/badge.svg?branch=master)](https://coveralls.io/github/consatan/shopify-demo?branch=master)

This repo is a code challenge of remote work, all demands were done, and the **tests code coverage over 99%**.

This project uses [generator-express-no-stress-typescript](https://github.com/cdimascio/generator-express-no-stress-typescript) to generate the boilerplate.

Try it on [Online Swagger UI](https://shopify_code_challenge.1s.lu) (authorize need)

> Uses [ExcelJS](https://github.com/exceljs/exceljs) to import csv/xlsx file to create products. The `parserOptions.headers` option not wroking in current version(v4.3.0) of exceljs. In this project, uses this [PR](https://github.com/exceljs/exceljs/pull/2080) version (I created this PR).

> `ts-node v10.8.1` have a bug when coverage reporting, see [#1797](https://github.com/TypeStrong/ts-node/issues/1797), [#1790](https://github.com/TypeStrong/ts-node/issues/1790), rollback to `v10.8.0`.

## Quick Start

#### Get started developing...

```shell
# install deps
npm install

# create your .env file and edit it
cp .env.example .env

# run in development mode
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) on your browser to try this API in Swagger UI.

#### Test It

Run the Mocha tests.

```shell
# unit test
npm run test:unit

# integration test
npm run test:integration

# full test
npm run test

# code coverage
npm run test:coverage
```

#### Run in *production* mode:

Compiles the application and starts it in production production mode.

```shell
npm run compile
npm start
```
