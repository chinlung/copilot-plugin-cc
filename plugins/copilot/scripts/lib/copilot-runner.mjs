import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import process from "node:process";

/**
 * Spawns `copilot` CLI with given options and captures output.
 * @param {string} cwd - Working directory
 * @param {object} options
 * @param {string} options.prompt - The prompt text
 * @param {string} [options.agent] - Built-in agent: code-review, task, explore, research, general-purpose
 * @param {string} [options.model] - Model name
 * @param {string} [options.outputFormat] - "json" or "text"
 * @param {string[]} [options.allowTools] - Specific tools to allow
 * @param {boolean} [options.allowAll] - Allow all permissions
 * @param {boolean} [options.noAskUser] - Prevent agent from asking questions (default true)
 * @param {string} [options.sharePath] - Export transcript to file
 * @param {string} [options.resume] - Resume a specific session by ID
 * @param {boolean} [options.continue] - Continue the most recent session
 * @param {boolean} [options.autopilot] - Enable autopilot mode
 * @param {number} [options.maxAutopilotContinues] - Max autopilot continuation rounds
 * @param {boolean} [options.shareGist] - Share transcript as a GitHub gist
 * @param {number} [options.timeoutMs] - Timeout in ms
 * @param {AbortSignal} [options.signal] - AbortSignal for cancellation
 * @param {(line: string) => void} [options.onStderr] - stderr line callback
 * @returns {Promise<{ status: number, stdout: string, stderr: string, jsonOutput: object|null, signal: string|null, error: Error|null }>}
 */
export async function spawnCopilot(cwd, options) {
  const args = [];

  if (options.agent) {
    args.push(`--agent=${options.agent}`);
  }

  args.push("-p", options.prompt);
  args.push("-s");

  const noAskUser = options.noAskUser !== false;
  if (noAskUser) {
    args.push("--no-ask-user");
  }

  if (options.outputFormat) {
    args.push(`--output-format=${options.outputFormat}`);
  }

  if (options.model) {
    args.push(`--model=${options.model}`);
  }

  if (options.allowAll) {
    args.push("--allow-all");
  }

  if (options.allowTools) {
    for (const tool of options.allowTools) {
      args.push(`--allow-tool=${tool}`);
    }
  }

  if (options.sharePath) {
    args.push(`--share=${options.sharePath}`);
  }

  if (options.resume) {
    args.push(`--resume=${options.resume}`);
  } else if (options.continue) {
    args.push("--continue");
  }

  if (options.autopilot) {
    args.push("--autopilot");
  }

  if (options.maxAutopilotContinues != null) {
    args.push(`--max-autopilot-continues=${options.maxAutopilotContinues}`);
  }

  if (options.shareGist) {
    args.push("--share-gist");
  }

  return new Promise((resolve) => {
    let timeoutId = null;
    let abortHandler = null;

    const spawnOptions = {
      cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      ...(process.platform === "win32" ? { shell: true } : {})
    };

    const child = spawn("copilot", args, spawnOptions);

    const stdoutChunks = [];
    const stderrChunks = [];

    child.stdout.on("data", (chunk) => {
      stdoutChunks.push(chunk);
    });

    if (options.onStderr) {
      const rl = createInterface({ input: child.stderr });
      rl.on("line", (line) => {
        stderrChunks.push(line);
        options.onStderr(line);
      });
    } else {
      child.stderr.on("data", (chunk) => {
        stderrChunks.push(chunk.toString("utf8"));
      });
    }

    function cleanup() {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (abortHandler && options.signal) {
        options.signal.removeEventListener("abort", abortHandler);
        abortHandler = null;
      }
    }

    function killChild() {
      try {
        child.kill("SIGTERM");
      } catch {
        // process may already be gone
      }
    }

    if (options.timeoutMs && options.timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        timeoutId = null;
        killChild();
      }, options.timeoutMs);
    }

    if (options.signal) {
      if (options.signal.aborted) {
        killChild();
      } else {
        abortHandler = () => killChild();
        options.signal.addEventListener("abort", abortHandler, { once: true });
      }
    }

    child.on("error", (error) => {
      cleanup();
      resolve({
        status: 1,
        stdout: "",
        stderr: "",
        jsonOutput: null,
        signal: null,
        error
      });
    });

    child.on("close", (code, sig) => {
      cleanup();
      const stdout = Buffer.concat(stdoutChunks).toString("utf8");
      const stderr = options.onStderr ? stderrChunks.join("\n") : stderrChunks.join("");

      let jsonOutput = null;
      if (options.outputFormat === "json" && stdout.trim()) {
        try {
          jsonOutput = JSON.parse(stdout.trim());
        } catch {
          // not valid JSON; leave as null
        }
      }

      resolve({
        status: code ?? 1,
        stdout,
        stderr,
        jsonOutput,
        signal: sig ?? null,
        error: null
      });
    });
  });
}
