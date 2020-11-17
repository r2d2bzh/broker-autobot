const brokerAutobot = require('../src');
const test = require('ava');

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
      foo: 'bar'
    },
    schemaFactories: [describeConfig],
  });
  await autobot.start();
  t.context.brokerContext = autobot.context;
});

test('fetch a simple config service', async t => {
  const describe = await t.context.brokerContext.broker.call('describe-config.get');
  t.is(describe.foo, 'bar');
});
