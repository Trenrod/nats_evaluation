import { dedent } from "./helper/generalhelper";
import { cleanUpNatsContainer, startNatsContainerWithConfig } from "./helper/dockerhelper";
import { natsConnectionWrapper } from "./helper/natstesthelper";
import { usernamePasswordAuthenticator } from "@nats-io/nats-core";

describe("Simple authentication tests", () => {
	// Sources: 
	// https://docs.nats.io/running-a-nats-service/configuration/securing_nats/auth_intro

	it("Plain Token connection", async () => {
		// For encrypted tokens: https://docs.nats.io/running-a-nats-service/configuration/securing_nats/auth_intro/tokens#bcrypted-tokens

		// Alternative
		// For BCrypt tokens (client need still plaintext key)
		// https://docs.nats.io/running-a-nats-service/configuration/securing_nats/auth_intro/tokens#bcrypted-tokens		
		const token = "s3cr3t";
		const natsConfig = dedent`
		authorization {
			token: ${token}
		}
		`;
		const config = await startNatsContainerWithConfig(natsConfig);

		// Without token exepct to throw auth error
		expect(async () => await natsConnectionWrapper("UCServer:A")).rejects.toThrow("Authorization Violation");

		// Connect server with token
		const ucserverA = await natsConnectionWrapper("UCServer:A", {
			token
		});
		expect(ucserverA.isClosed()).toBe(false);
		await ucserverA.close();
		await cleanUpNatsContainer(config);
	}, 30_000)

	it("User/Password simple", async () => {
		// https://docs.nats.io/running-a-nats-service/configuration/securing_nats/auth_intro/username_password
		const natsConfig = dedent`
		authorization: {
			users: [
				{user: a, password: a},
				{user: b, password: b}
			]
		}
		`;
		const config = await startNatsContainerWithConfig(natsConfig);
		// Invalid credentials
		expect(async () => await natsConnectionWrapper("UCServer:A", {
			authenticator: usernamePasswordAuthenticator("ucserver_a", "XXXX")
		})).rejects.toThrow("Authorization Violation");

		// Connect server with token
		const ucserverA = await natsConnectionWrapper("UCServer:A", {
			authenticator: usernamePasswordAuthenticator("a", "a")
		});

		expect(ucserverA.isClosed()).toBe(false);
		await ucserverA.close();
		await cleanUpNatsContainer(config);
	}, 30_000);

	it("User/password with permissions", async () => {
		// https://docs.nats.io/running-a-nats-service/configuration/securing_nats/auth_intro/username_password
		const natsConfig = dedent`
		authorization: {
			ADMIN = {
				publish = ">"
				subscribe = ">"
			}
			SERVER_A = {

			}
			CLIENT_A = {
			
			}

			users: [
				{user: server_a, password: sa, permissions: [""] }
				{user: client_a, password: ca, permissions: }
			]
		}
		`;
		const config = await startNatsContainerWithConfig(natsConfig);
	});

	it("JWT authentication", async () => {
		// https://docs.nats.io/running-a-nats-service/configuration/securing_nats/auth_intro/jwt

	}, 30_000);
});