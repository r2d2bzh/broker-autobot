const brokerAutobot = require('../src');
const test = require('ava');
const { v4: uuid } = require('uuid');

test('fetch a simple config service', async t => {
  const describeConfig = () => ({
    name: 'describe-config',
    actions: {
      get: (context) => context.broker.options,
    },
  });
  const autobot = await brokerAutobot({
    init: {
      foo: 'bar',
      nodeID: uuid() + '-autobot'
    },
    schemaFactories: [describeConfig],
  });
  await autobot.start();
  const { nodeID, ...config } = await autobot.call('describe-config.get');
  t.snapshot(config);
});
