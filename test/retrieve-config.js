const brokerAutobot = require('../src');
const test = require('ava');
const { ServiceBroker } = require('moleculer');
const { v4: uuid } = require('uuid');
const { describeConfigFactory } = require('./helpers/utils');

const retrieveConfig = async ()=> {
  const serviceBroker = new ServiceBroker({
    transporter: 'TCP',
    nodeID: uuid() + '-config-holder'
  });
  serviceBroker.createService({
    name: 'config-holder',
    actions: {
      get: () => ({ dynamicConfig: true }),
    },
  });
  await serviceBroker.start();
}

test.before(async (t) => {
  await retrieveConfig();
  t.context.autobot = await brokerAutobot({
    init: {
      foo: 'bar',
      transporter: 'TCP',
      nodeID: uuid() + '-autobot',
    },
    retrieveAction: {
      serviceName: 'config-holder',
      actionName: 'get',
    },
    schemaFactories: [describeConfigFactory],
  });
  await t.context.autobot.start();
});

test.after.always(async (t) => {
  await t.context.autobot.stop();
});

test('Autobot should start with a dynamic config', async t => {
  const { nodeID, ...config } = await t.context.autobot.call('describe-config.get');
  t.snapshot(config);
});
