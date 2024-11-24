import { downAll, upAll } from "docker-compose";
import { getNatsServerDockerComposeTemplateWithNatsConfig } from "../natsDockerComposeFiles/simple_config_template";
import { rmdirSync } from "node:fs";
import { dirname } from "node:path";

type DockerNatsConfig = { dockerComposeNatsConfigFilePath: object, natsConfigFilePath: string };

/**
 * Starts a NATS server container using a provided configuration.
 * 
 * @param {string} natsConfig - The NATS server configuration.
 * @returns {Promise<{ dockerComposeNatsConfigFilePath: object, natsConfigFilePath: string }>} - The Docker Compose configuration paths.
 */
export const startNatsContainerWithConfig = async function(natsConfig: string): Promise<DockerNatsConfig> {
	const dockerConfig = getNatsServerDockerComposeTemplateWithNatsConfig(natsConfig);
	await upAll({
		configAsString: JSON.stringify(dockerConfig.dockerComposeNatsConfigFilePath)
	}).then(() => console.log("Nats server started"), err => { console.error("Nats server failed", err); process.exit(1) });
	return dockerConfig;
}

/**
 * Cleans up the NATS server container by stopping it and removing its configuration directory.
 *
 * @param {DockerNatsConfig} dockerNatsConfig - The Docker NATS configuration.
 * @returns {Promise<void>} - A promise that resolves when the cleanup is complete.
 */
export const cleanUpNatsContainer = async function(dockerNatsConfig: DockerNatsConfig): Promise<void> {
	await downAll({
		configAsString: JSON.stringify(dockerNatsConfig.dockerComposeNatsConfigFilePath)
	}).then(() => console.log("Nats server stopped"), err => { console.error("Nats server stop failed", err); process.exit(1) });
	rmdirSync(dirname(dockerNatsConfig.natsConfigFilePath), { recursive: true });
}
