import { ChildProcess, fork, Serializable } from "child_process";

interface ClusterConfig {
  backgroundTaskFile: string | URL;
  clusterSize: number;
  onMessage: (message: unknown) => void;
}

function roundRobin(array: ChildProcess[], index = 0) {
  return function () {
    if (index >= array.length) index = 0;

    return array[index++];
  };
}

// Function to start child processes
function initializeCluster({
  backgroundTaskFile,
  clusterSize,
  onMessage,
}: ClusterConfig) {
  const processes = new Map();
  for (let index = 0; index < clusterSize; index++) {
    const child = fork(backgroundTaskFile);
    child.on("exit", () => {
      // console.log(`process ${child.pid} exited`)
      processes.delete(child.pid);
    });

    child.on("error", (error) => {
      // console.log(`process ${child.pid} has an error`, error)
      process.exit(1);
    });

    child.on("message", (message) => {
      if (message !== "item-done") return;
      onMessage(message);
    });

    processes.set(child.pid, child);
  }

  return {
    getProcess: roundRobin([...processes.values()]),
    killAll: () => {
      processes.forEach((child) => child.kill());
    },
  };
}

export function initialize({
  backgroundTaskFile,
  clusterSize,
  onMessage,
}: ClusterConfig) {
  const { getProcess, killAll } = initializeCluster({
    backgroundTaskFile,
    clusterSize,
    onMessage,
  });
  // console.log(`starting with ${clusterSize} processes`)

  function sendToChild(message: Serializable) {
    const child = getProcess();
    // send only if channel is open
    // if (child.killed) return;
    child.send(message);
  }

  return {
    sendToChild,
    killAll,
  };
}
