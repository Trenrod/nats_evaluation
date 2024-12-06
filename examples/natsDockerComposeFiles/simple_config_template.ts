import { mkdtempSync, openSync, writeFileSync, writeSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { prettyFormat } from '../helper/generalhelper';

/**
 * Create a temp file with a nats configuration
 * 
 * @param natsConfig - config to store
 * @returns nats docker configuration and config file forcleanup
 */
export const getNatsServerDockerComposeTemplateWithNatsConfig = (natsConfig: string): { dockerComposeNatsConfigFilePath: object, natsConfigFilePath: string } => {
	const tmpDir = mkdtempSync(join(tmpdir(), 'natstest-'));
	const natsConfigFilePath = join(tmpDir, "nats-server.conf")
	writeFileSync(natsConfigFilePath, prettyFormat(natsConfig));
	console.log("Using nats server config at: " + natsConfigFilePath);

	// https://docs.nats.io/running-a-nats-service/configuration
	// No need to override command because of:  https://github.com/nats-io/nats-docker/blob/main/2.11.x/alpine3.20/Dockerfile
	const dockerComposeNatsConfigFilePath = {
		"services": {
			"nats-server-test": {
				"image": "nats:latest",
				"container_name": "nats-server-test",
				"restart": "unless-stopped",
				"command": "-c /etc/nats/nats-server.conf",
				"ports": [
					"4222:4222",
					"8222:8222"
				],
				"volumes": [
					`${natsConfigFilePath}:/etc/nats/nats-server.conf`
				]
			}
		}
	};

	writeFileSync("composetest.json", JSON.stringify(dockerComposeNatsConfigFilePath));
	return {
		natsConfigFilePath: natsConfigFilePath,
		dockerComposeNatsConfigFilePath
	}
}
