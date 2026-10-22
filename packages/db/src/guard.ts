const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export const assertLocalTarget = (url: string): void => {
  const { hostname } = new URL(url);
  if (!LOCAL_HOSTS.has(hostname)) {
    throw new Error(`Refusing to run against "${hostname}". Tests, seeds and evals only run against the local stack.`);
  }
};
