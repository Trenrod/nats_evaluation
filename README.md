# NATS Sandbox

Creates simple nats use cases out of the box.

## Features

- Inline configuration
	```typescript
	// Creates a config
	const token = "s3cr3t";
	const natsConfig = dedent`
	authorization {
		token: ${token}
	}
	`;
	```
- Docker compose generation and start in a single line
	```typescript
	// Creates a docker compose and injects nats config in one line
	const natsServer = await startNatsContainerWithConfig(natsConfig);
	```

## Setup

### Requirement
- Docker host running

### Node/Browser Typescript

- Installation: 
	```sh
	# Install core freature like WebSocket connection
	npm install @nats-io/nats-core
	# Install native transport features line native nats tcp connection
	npm install @nats-io/transport-node
	```
- Repo: https://github.com/nats-io/nats.js
- Guide https://nats-io.github.io/nats.js/core/index.html

## Examples

Examples are desinged to be viewed in this order. Each tests introduces new options or patterns.

### Simple client server messaging
- `./examples/simple_client_server.test.ts`
- Focus on bare minimum client server messaging. Introduces `subjects` and `queues`

### Authentication simple
- `./examples/authentication_simple.test.ts`
- Focus on simple authentications of clients and servers. Introduces `users` and `permissions`.

### Authentication multi tenancy
- `./examples/authentication_accounts.test.ts`
- Focus on clients and servers authentications with different tenancy. Introduces `accounts`.

### TODO: Authentication jwt
- `./examples/authentication_jwt.test.ts`
- Focus on JWT authentications of clients and servers. Introduces `operator` and 3rd parth authentication endpoints [auth callout](https://docs.nats.io/running-a-nats-service/configuration/securing_nats/auth_callout).

## Info

### Optional manual setup installations

- Install on Linux: 
	```bash
	# Download latest from https://github.com/nats-io/natscli/releases
	wget https://github.com/nats-io/natscli/releases/download/v0.1.5/nats-0.1.5-amd64.deb
	# Install
	dpkg --install nats-0.1.5-amd64.deb
	```

- Start `nats server` as a docker container
	```bash
	# Latest docker images and configs https://hub.docker.com/_/nats/
	# Start nats with with default client port (4222) and management port (8222)
	docker run -d --name nats-server -p 4222:4222 -p 8222:8222 nats:latest
	```
