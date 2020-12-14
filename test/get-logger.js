const test = require('ava');
const { v4: uuid } = require('uuid');
const brokerAutobot = require('../src');

test('Autbot should have a getlogger method', (t) => {
  const autobot = brokerAutobot({
    initialSettings: {
      nodeID: `${uuid()}-autobot`,
      logLevel: { '**': 'warn' },
    },
  });
  t.notThrows(() => {
    autobot.getLogger('test').warn('Getlogger here');
  });
});

test('Autbot should be able to log after start', async (t) => {
  const autobot = brokerAutobot({
    initialSettings: {
      nodeID: `${uuid()}-autobot`,
      logLevel: { '**': 'warn' },
    },
  });
  await autobot.start();
  t.notThrows(() => {
    autobot.getLogger('test').warn('Getlogger here');
  });
});
