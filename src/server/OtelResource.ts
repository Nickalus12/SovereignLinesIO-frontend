import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { getServerConfigFromServer } from "../core/configuration/ConfigLoader";

const config = getServerConfigFromServer();

export function getOtelResource() {
  return resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "sovereign-lines",
    [ATTR_SERVICE_VERSION]: "1.0.0",
    "service.instance.id": process.env.HOSTNAME,
    "sovereign-lines.environment": config.env(),
    "sovereign-lines.host": process.env.HOST,
    "sovereign-lines.domain": process.env.DOMAIN,
    "sovereign-lines.subdomain": process.env.SUBDOMAIN,
    "sovereign-lines.component": process.env.WORKER_ID
      ? "Worker " + process.env.WORKER_ID
      : "Master",
    // The comma-separated list tells OpenTelemetry which resource attributes
    // should be converted to Loki labels
    "loki.resource.labels":
      "service.name,service.instance.id,sovereign-lines.environment,sovereign-lines.host,sovereign-lines.domain,sovereign-lines.subdomain,sovereign-lines.component",
  });
}
