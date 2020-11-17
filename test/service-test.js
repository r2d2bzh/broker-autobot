const brokerAutobot = require('../src');
const test = require('ava');
const { v4: uuid } = require('uuid');

test.before(async (t) => {
  const describeConfig = () => ({
    name: 'describe-config',
    actions: {
      get: {
        handler: (context) => {
          return context.broker.options;
        },
      },
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
  t.context.brokerContext = autobot.context;
});

test('fetch a simple config service', async t => {
  const {nodeID, ...config} = await t.context.brokerContext.broker.call('describe-config.get');
  t.snapshot(config);
});
