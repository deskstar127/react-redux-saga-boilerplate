import 'polyfills';

let global: any;

process.env.PUBLIC_URL = '';

global.requestAnimationFrame = callback => {
  setTimeout(callback, 0);
};

global.matchMedia = () => ({
  matches: false,
  addListener: () => undefined,
  removeListener: () => undefined,
});

const consoleError = console.error;
console.error = jest.fn(error => {
  const message = error instanceof Error ? error.message : error;
  const skipMessages = [
    'Warning: <%s /> is using incorrect casing.',
    'The tag <%s> is unrecognized in this browser.',
    // 'Warning: Failed prop type',
    '`transition` of value `rotate`',
    'Invalid transition: rotate',
    "Content type isn't valid:",
  ];
  let shouldSkip = false;

  for (const s of skipMessages) {
    if (message.includes(s)) {
      shouldSkip = true;
    }
  }

  if (!shouldSkip) {
    consoleError(error);
  }
});

process.on('uncaughtException', err => {
  console.error(`${new Date().toUTCString()} uncaughtException:`, err.message);
  console.error(err.stack);
});
