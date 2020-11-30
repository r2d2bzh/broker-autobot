const test = require('ava');
const { v4: uuid } = require('uuid');
const brokerAutobot = require('../src/broker-autobot');
const middleware = require('./helpers/middleware');
const { describeConfigFactory } = require('./helpers/utils');

const before = async (middlewareInstance) => {
  const autobot = brokerAutobot({
    initialSettings: {
      foo: 'bar',
      nodeID: `${uuid()}-autobot`,
      logLevel: { '**': 'warn' },
      ...(middlewareInstance ? { middlewares: [middlewareInstance] } : {}),
    },
    schemaFactories: [describeConfigFactory],
  });
  await autobot.start();
  return autobot;
};

test('Autobot should start with a simple config', async (t) => {
  t.context.autobot = await before();
  const { nodeID, ...config } = await t.context.autobot.call('describe-config.get');
  t.snapshot(config);
  await t.context.autobot.stop();
});

test('Autobot should start with a simple config and middleware', async (t) => {
  t.context.autobot = await before(middleware(t));
  const { nodeID, ...config } = await t.context.autobot.call('describe-config.get');
  t.snapshot(config);
  await t.context.autobot.stop();
  t.is(t.context.middlewareState, 'recycled');
});
