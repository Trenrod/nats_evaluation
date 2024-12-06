import { dedent } from "./helper/generalhelper";
import { cleanUpNatsContainer, startNatsContainerWithConfig } from "./helper/dockerhelper";
import { natsConnectionWrapper } from "./helper/natstesthelper";
import { usernamePasswordAuthenticator } from "@nats-io/nats-core";

describe("JWT Test", () => {
	it("Plain Token connection", async () => {
		const natsConfig = dedent`
		accounts: {
			A: {
				users: [
					{ user: a, password: a }
				]
			},
			B: {
				users: [
					{ user: b, password: b }
				]
			}
		}
		`;
		const config = await startNatsContainerWithConfig(natsConfig);
		const A_a = await natsConnectionWrapper("A_a", { authenticator: usernamePasswordAuthenticator("a", "a") });
		const B_b = await natsConnectionWrapper("B_b", { authenticator: usernamePasswordAuthenticator("b", "b") });

	}, 30_000)

	it("User/password with permissions", async () => {
		// https://docs.nats.io/running-a-nats-service/configuration/securing_nats/auth_intro/username_password
		const natsConfig = dedent`
		authorization: {
			ADMIN = {
				publish = ">"
				subscribe = ">"
			}
			PERSMISSION_SERVER_A = {
				subscribe = ["server.server_a.>"]
				publish = "_INBOX.>"
			}
			PERSMISSION_CLIENT_A = {
				publish = ["server.server_a.>"]
				subscribe = "_INBOX.>"
			}

			users: [
				{user: admin, password: aa, permissions: $ADMIN}
				{user: server_a, password: sa, permissions: $PERSMISSION_SERVER_A}
				{user: client_a, password: ca, permissions: $PERSMISSION_CLIENT_A}
			]
		}
		`;
		const config = await startNatsContainerWithConfig(natsConfig);

		let adminMessageCounter = 0;
		const admin = await natsConnectionWrapper("Admin", {
			authenticator: usernamePasswordAuthenticator("admin", "aa")
		});
		admin.subscribe(">").callback = (err, msg) => {
			if (err) return;
			console.log("Admin:" + msg.string());
			adminMessageCounter++;
		};

		let serverMessageCounter = 0;
		const serverA = await natsConnectionWrapper("Server:A", {
			authenticator: usernamePasswordAuthenticator("server_a", "sa"),


		});
		// NOTE: Subscribe without permission will throw no error but will also not receive any message
		// https://github.com/nats-io/nats.go/issues/1583

		// Valid subscription
		serverA.subscribe('server.server_a.>').callback = async (err, msg) => {
			if (err) return;
			console.log("ServerA:" + msg.string());
			expect(msg.reply).not.toBeUndefined();
			console.log("ServerA reply to:" + msg.reply);
			expect(msg.respond("pong")).toBe(true);
			serverMessageCounter++;
		};

		const clientA = await natsConnectionWrapper("Client:A", {
			authenticator: usernamePasswordAuthenticator("client_a", "ca")
		});
		// Test invalid request without permission
		expect(async () => await clientA.request("server.server_b.client.client_a.ping", "ping")).rejects.toThrow("Permissions Violation for Publish to \"server.server_b.client.client_a.ping\"");
		// Test valid request
		const response = await clientA.request("server.server_a.client.client_a.ping", "ping");
		expect(response.string()).toBe("pong");

		// Wait 2 seconds
		await new Promise((resolve) => setTimeout(() => resolve(null), 2000));
		expect(serverMessageCounter).toBe(1);
		expect(adminMessageCounter).toBe(2);

		expect(serverA.isClosed()).toBe(false);
		expect(clientA.isClosed()).toBe(false);
		expect(admin.isClosed()).toBe(false);
		await Promise.all([serverA.close(), admin.close(), clientA.close()]);
		await cleanUpNatsContainer(config);
	}, 10_000);
});