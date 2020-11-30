const test = require('ava');
const { v4: uuid } = require('uuid');
const brokerAutobot = require('../src');
const { describeConfigFactory } = require('./helpers/utils');

test.before(async (t) => {
  t.context.autobot = await brokerAutobot({
    initialSettings: {
      foo: 'bar',
      nodeID: `${uuid()}-autobot`,
      logLevel: { '**': 'warn' },
    },
    schemaFactories: [describeConfigFactory],
  });
  await t.context.autobot.start();
});

test.after.always(async (t) => {
  await t.context.autobot.stop();
});

test('Autobot should start with a simple config', async (t) => {
  const { nodeID, ...config } = await t.context.autobot.call('describe-config.get');
  t.snapshot(config);
});
