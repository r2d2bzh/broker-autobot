const brokerAutobot = require('../src');
const test = require('ava');
const { v4: uuid } = require('uuid');
const { describeConfigFactory } = require('./helpers/utils');

test.before(async (t)=>{
  t.context.autobot = await brokerAutobot({
    init: {
      foo: 'bar',
      nodeID: uuid() + '-autobot',
    },
    schemaFactories: [describeConfigFactory],
  });
  await t.context.autobot.start();
});

test.after.always(async (t) => {
  await t.context.autobot.stop();
});

test('Autobot should start with a simple config', async t => {
  const { nodeID, ...config } = await t.context.autobot.call('describe-config.get');
  t.snapshot(config);
});
