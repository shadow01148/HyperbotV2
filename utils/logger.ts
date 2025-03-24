import pino, { Logger } from "pino";

// Define the logger instance with type annotations
const logger: Logger = pino({
  level: "debug",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "HH:MM:ss Z",
      ignore: "pid,hostname",
      messageFormat: "\x1b[92m{msg}\x1b[0m", // ANSI escape codes for light green text
    },
  },
});

export default logger;
