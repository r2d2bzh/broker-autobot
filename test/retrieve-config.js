const test = require('ava');
const { ServiceBroker } = require('moleculer');
const { v4: uuid } = require('uuid');
const brokerAutobot = require('../src/broker-autobot');
const { describeConfigFactory } = require('./helpers/utils');
const middleware = require('./helpers/middleware');

const retrieveConfig = async () => {
  const serviceBroker = new ServiceBroker({
    transporter: 'TCP',
    nodeID: `${uuid()}-config-holder`,
    logLevel: { '**': 'warn' },
  });
  serviceBroker.createService({
    name: 'config-holder',
    actions: {
      get: () => ({ dynamicConfig: true }),
    },
  });
  await serviceBroker.start();
};

const before = async (middlewareInstance) => {
  await retrieveConfig();
  const autobot = brokerAutobot({
    initialSettings: {
      foo: 'bar',
      transporter: 'TCP',
      nodeID: `${uuid()}-autobot`,
      logLevel: { '**': 'warn' },
      ...(middlewareInstance ? { middlewares: [middlewareInstance] } : {}),
    },
    settingsRetrievalAction: {
      serviceName: 'config-holder',
      actionName: 'get',
    },
    schemaFactories: [describeConfigFactory],
  });
  await autobot.start();
  return autobot;
};

test('Autobot should start with a dynamic config', async (t) => {
  const autobot = await before();
  const { nodeID, ...config } = await autobot.call('describe-config.get');
  t.snapshot(config);
  await autobot.stop();
});

test('Autobot should start with a dynamic config and middleware', async (t) => {
  const autobot = await before(middleware(t));
  const { nodeID, ...config } = await autobot.call('describe-config.get');
  t.snapshot(config);
  await autobot.stop();
  t.is(t.context.middlewareState, 'recycled');
});
