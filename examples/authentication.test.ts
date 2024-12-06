import { cleanUpNatsContainer, startNatsContainerWithConfig } from "./helper/dockerhelper";
import { natsConnectionWrapper } from "./helper/natstesthelper";
import { Msg, RequestError, usernamePasswordAuthenticator } from "@nats-io/nats-core";

describe("Simple authentication tests", () => {
	// Sources: 
	// https://docs.nats.io/running-a-nats-service/configuration/securing_nats/auth_intro

	it("Plain Token connection", async () => {
		// For encrypted tokens: https://docs.nats.io/running-a-nats-service/configuration/securing_nats/auth_intro/tokens#bcrypted-tokens

		// Alternative
		// For BCrypt tokens (client need still plaintext key)
		// https://docs.nats.io/running-a-nats-service/configuration/securing_nats/auth_intro/tokens#bcrypted-tokens		
		const token = "s3cr3t";
		const natsConfig = `
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
		const natsConfig = `
		authorization: {
			users: [
				{user: a, password: a}
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
		const natsConfig = `
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


	/**
	 * NATS supports multi tenancy by allowing mutliple accounts each account has its own users.
	 * By default a user from ACCOUNT_1 cant access any data on ACCOUNT_2
	 * 
	 * In this example we use every account as a UCServer and the account name is the UCSID of each UCServer
	 * UCS1 and Client1 get connected and ready (subribe)
	 * But Client2 requres something from UCS2 which is not ready.
	 * Later UCS2 gets ready and Client2 get its response
	 */
	it("Multi tenancy UCServer example", async () => {
		const Customer1 = {
			UCSIDUCServer1: {
				ucsid: "UCSIDUCServer1", password: "server1"
			},
			Client1: {
				uuid: "UUIDClient1", username: "UCServer1UserClient1", password: "client1"
			}
		};
		const Customer2 = {
			UCSIDUCServer2: {
				ucsid: "UCSIDUCServer2", password: "server2"
			},
			Client2: {
				uuid: "UUIDClient2", username: "UCServer2UserClient2", password: "client2"
			}
		};
		const natsConfig = `
		accounts: {
			${Customer1.UCSIDUCServer1.ucsid}: {
				users: [
					{ 
						user: ${Customer1.UCSIDUCServer1.ucsid},
						password: ${Customer1.UCSIDUCServer1.password},
						permissions: {
							subscribe: ["ucserver.*", "_INBOX.>"],
							publish: ["client.>", "_INBOX.>"]
						}
					},
					{ 
						user: ${Customer1.Client1.username},
						password: ${Customer1.Client1.password},
						permissions: {
							subscribe: ["client.${Customer1.Client1.uuid}.*", "_INBOX.>"],
							publish: ["ucserver.*", "_INBOX.>"]
						}
					},
				]
			}
			${Customer2.UCSIDUCServer2.ucsid}: {
				users: [
					{ 
						user: ${Customer2.UCSIDUCServer2.ucsid},
						password: ${Customer2.UCSIDUCServer2.password},
						permissions: {
							subscribe: ["ucserver.*", "_INBOX.>"],
							publish: ["client.>", "_INBOX.>"]
						}
					},
					{ 
						user: ${Customer2.Client2.username},
						password: ${Customer2.Client2.password},
						permissions: {
							subscribe: ["client.${Customer2.Client2.uuid}.*", "_INBOX.>"],
							publish: ["ucserver.*", "_INBOX.>"]
						}
					},
				]
			}
		}	
		`;
		const config = await startNatsContainerWithConfig(natsConfig);

		// Login and subscribe UCServer1
		const ucserver1 = await natsConnectionWrapper(Customer1.UCSIDUCServer1.ucsid, { authenticator: usernamePasswordAuthenticator(Customer1.UCSIDUCServer1.ucsid, Customer1.UCSIDUCServer1.password) });
		ucserver1.subscribe(`ucserver.*`, { callback: (err: Error | null, msg: Msg) => { msg.respond(JSON.stringify({ pong: Customer1.UCSIDUCServer1.ucsid })); } });

		// Login an subscribe client 1
		const client1 = await natsConnectionWrapper(Customer1.Client1.uuid, { authenticator: usernamePasswordAuthenticator(Customer1.Client1.username, Customer1.Client1.password) });
		client1.subscribe(`client.${Customer1.Client1.uuid}.*`, { callback: (_: Error | null, msg: Msg) => { msg.respond(JSON.stringify({ pong: Customer1.Client1.uuid })); } });

		// Login and subscribe UCServer2
		const ucserver2 = await natsConnectionWrapper(Customer2.UCSIDUCServer2.ucsid, { authenticator: usernamePasswordAuthenticator(Customer2.UCSIDUCServer2.ucsid, Customer2.UCSIDUCServer2.password) });

		// // Login an subscribe client 2
		const client2 = await natsConnectionWrapper(Customer2.Client2.uuid, { authenticator: usernamePasswordAuthenticator(Customer2.Client2.username, Customer2.Client2.password) });
		client2.subscribe(`client.${Customer2.Client2.uuid}.*`, { callback: (_: Error | null, msg: Msg) => { msg.respond(JSON.stringify({ pong: Customer2.Client2.uuid })); } });

		// Wait till everyone is connected
		await new Promise((resolve) => setTimeout(resolve, 1000));

		// Client2 sends request to ucserver2
		const responseServerFail = client2.request(`ucserver.asnPing`, JSON.stringify({ ping: true }))
		expect(responseServerFail).rejects.toBeInstanceOf(RequestError);

		// UCServer2 is now ready ready
		ucserver2.subscribe(`ucserver.*`, { callback: (err: Error | null, msg: Msg) => { msg.respond(JSON.stringify({ pong: Customer2.UCSIDUCServer2.ucsid })); } });
		await new Promise((resolve) => setTimeout(resolve, 1000));
		const responseServer = await client2.request(`ucserver.asnPing`, JSON.stringify({ ping: true }))
		expect(responseServer.json()).toEqual({ pong: Customer2.UCSIDUCServer2.ucsid });

		// Server2 sends request to client2
		const responseClient = await ucserver1.request(`client.${Customer1.Client1.uuid}.asnPing`, JSON.stringify({ ping: true }))
		expect(responseClient.json()).toEqual({ pong: Customer1.Client1.uuid });

		await Promise.all([ucserver1.close(), client1.close(), ucserver2.close(), client2.close()]);
		await cleanUpNatsContainer(config);
	}, 30_000);
});