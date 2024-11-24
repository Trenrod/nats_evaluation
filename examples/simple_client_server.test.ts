import { Msg, NatsConnection } from "@nats-io/nats-core/lib/core";
import { logNatsMessage, natsConnectionWrapper } from "./helper/natstesthelper";
import { downAll, run, upAll } from 'docker-compose';
import simpleOpenNatsServerDockerCompose from "./natsDockerComposeFiles/simple_open.json";

describe("Test simple client server messages", () => {
	// Docker compose reference
	let dockerNatsServerConfig = JSON.stringify(simpleOpenNatsServerDockerCompose);
	// Connection as a subscriber (e.g. UCServer)
	let ucServerA: NatsConnection;
	let ucServerB: NatsConnection;
	// Connection as a publisher (e.g. client)
	let clientA: NatsConnection;
	let clientB: NatsConnection;

	/**
	 * Ramp up nats server as a docker container
	 */
	beforeAll(async () => {
		await upAll({
			configAsString: dockerNatsServerConfig
		}).then(() => console.log("Nats server started"), err => { console.error("Nats server failed", err); process.exit(1) });
	})

	/**
	 * Shuts down nats server docker container
	 */
	afterAll(async () => {
		await downAll({
			configAsString: dockerNatsServerConfig
		}).then(() => console.log("Nats server stopped"), err => { console.error("Nats server failed to stop", err); process.exit(1) });
	})

	/**
	 * Create instances of clients and servers
	 */
	beforeEach(async () => {
		ucServerA = await natsConnectionWrapper("UCServer:A");
		ucServerB = await natsConnectionWrapper("UCServer:B");
		clientA = await natsConnectionWrapper("Client:A");
		clientB = await natsConnectionWrapper("Client:B");
	});

	/**
	 * Close instnaces of clients and servers
	 */
	afterEach(async () => {
		await ucServerA.close();
		await ucServerB.close();
		await clientA.close();
		await clientB.close();
	})

	it("One client - one server pub sub", (done) => {
		const dataToSend = { who: "World" };

		// UCServer subscribe
		const ucServerASubscription = ucServerA.subscribe("ucserver.A.*");
		ucServerASubscription.callback = (error, msg) => {
			try {
				expect(error).toBeNull();
				logNatsMessage("onInvoke - UCServerA", msg);
				expect(msg).toMatchObject({
					subject: "ucserver.A.AsnHello",
					headers: undefined, // 
					reply: '',
					sid: 1
				});
				expect(JSON.parse(msg.data.toString())).toEqual(dataToSend);
				done();
			} catch (error) {
				done(error);
			}
		};

		// Client publish
		clientA.publish("ucserver.A.AsnHello", JSON.stringify(dataToSend));
	}, 10_000);


	it("One client - one server reply", (done) => {
		const dataToSendRequest = { request: "2+2" };
		const dataToSendResponse = { result: "4" };

		// UCServer subscribe
		const ucServerASubscription = ucServerA.subscribe("ucserver.A.*");
		ucServerASubscription.callback = (error, msg) => {
			try {
				expect(error).toBeNull();
				logNatsMessage("onInvoke - UCServerA", msg);
				expect(msg).toMatchObject({
					subject: "ucserver.A.AsnHello",
					headers: undefined, // 
					sid: 1
				});
				expect(msg.reply).not.toBe("");
				expect(JSON.parse(msg.data.toString())).toEqual(dataToSendRequest);
				expect(msg.respond(JSON.stringify(dataToSendResponse))).toBe(true);
			} catch (error) {
				done(error);
			}
		};

		// Client publish
		clientA.request("ucserver.A.AsnHello", JSON.stringify(dataToSendRequest))
			.then(msg => {
				logNatsMessage("onResult - ClientA", msg);
				expect(msg).toMatchObject({
					headers: undefined, // 
					sid: 1
				});
				done();
			}).catch(error => done(error));
	}, 5000);

	it("One client - multiple server - groups", (done) => {
		const queueName = "ucsid:A";
		const resultMap = { a: 0, b: 0 };
		ucServerA.subscribe("ucserver.X.*", {
			queue: queueName, callback: (error, msg: Msg) => {
				resultMap.a += 1;
			}
		});
		ucServerB.subscribe("ucserver.X.*", {
			queue: queueName, callback: (error, msg: Msg) => {
				resultMap.b += 1;
			}
		});

		const iterations = 10_000;
		for (let i = 0; i < iterations; i++) {
			setImmediate(() => {
				clientA.publish("ucserver.X.Tick", JSON.stringify("tick"));
			});
		}
		setTimeout(() => {
			console.log({ resultMap });
			expect(resultMap.a + resultMap.b).toBe(iterations);
			done()
		}, 2_000);
	}, 10_000);
});