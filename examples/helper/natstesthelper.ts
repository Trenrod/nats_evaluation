import { ConnectionOptions, Msg, NatsConnection, wsconnect } from "@nats-io/nats-core";
import { connect } from "@nats-io/transport-node";

/**
 * Wrappes a connection
 */
export const natsConnectionWrapper = async function(name: string, opts?: ConnectionOptions): Promise<NatsConnection> {
	// Connection as a subscriber (e.g. UCServer)
	const natsConnection = await connect(opts);
	console.log(`${name} connected`);
	// this promise indicates the client closed
	natsConnection.closed().then((error: unknown) => {
		if (error) console.error(`${name} closed with error:`, error);
		else console.log(`${name} successfully closed`);
	});
	return natsConnection;
}

/**
 * Wrappes a nats websocket connection
 * https://nats-io.github.io/nats.js/core/index.html#md:websocket-support
 */
export const natsWebSocketConnectionWrapper = async function(name: string) {
	// Connection as a subscriber (e.g. UCServer)
	const natsConnection = await wsconnect();
	console.log(`${name} connected`);
	// this promise indicates the client closed
	natsConnection.closed().then((error) => {
		if (error) console.error(`${name} closed with error:`, error);
		else console.log(`${name} successfully closed`);
	});
	return natsConnection;
}

/**
 * 
 * @param msg - nats message to log
 */
export const logNatsMessage = async function(title: string, msg: Msg) {
	const received = JSON.parse(msg.data.toString()); // Mesage
	console.log(title, {
		subject: msg.subject, // Subject received
		headers: msg.headers, // 
		reply: msg.reply, // Reply address field
		sid: msg.sid, // Subsription id
		data: received
	});
}