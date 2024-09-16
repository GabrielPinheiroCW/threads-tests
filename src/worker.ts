import { ChildProcess, fork, Serializable } from "child_process";

export const DONE_SIGNAL = "item-done";

interface Config {
  backgroundTaskFile: string;
  clusterSize: number;
  onError: (error: Error) => void;
  onMessage: (message: Serializable) => void;
}

function roundRobin(array: ChildProcess[], index = 0) {
  return function () {
    if (index >= array.length) index = 0;

    return array[index++];
  };
}

// Function to start child processes
function initializeWorker({
  backgroundTaskFile,
  clusterSize,
  onError,
  onMessage,
}: Config) {
  const processes = new Map();
  for (let index = 0; index < clusterSize; index++) {
    const child = fork(backgroundTaskFile);
    child.on("exit", () => {
      processes.delete(child.pid);
    });

    child.on("error", (error) => {
      onError(error);
    });

    child.on("message", (message) => {
      if (message !== DONE_SIGNAL) return;
      onMessage(message);
    });

    console.log(
      `[initializeWorker] Started child #${index + 1} process ${child.pid}`
    );

    processes.set(child.pid, child);
  }

  return {
    getProcess: roundRobin([...processes.values()]),
    killAll: () => {
      processes.forEach((child) => child.kill());
    },
  };
}

export function initialize(config: Config) {
  const { getProcess, killAll } = initializeWorker(config);

  function sendToChild(message: Serializable) {
    getProcess().send(message);
  }

  return {
    sendToChild,
    killAll,
  };
}
