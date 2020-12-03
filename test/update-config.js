// @ts-check
const test = require('ava');
const { ServiceBroker } = require('moleculer');
const { v4: uuid } = require('uuid');
const brokerAutobot = require('../src');
const middleware = require('./helpers/middleware');
const { describeConfigFactory } = require('./helpers/utils');

const updateConfig = async (t, autobot) => {
  const configIsUpdated = new Promise((res) => autobot.on('config-update', res));
  await t.context.configHolderServiceBroker.waitForServices(`autobot-updater-${autobot.nodeID()}`);
  const { acknowledge } = await t.context.configHolderServiceBroker.call('dynamic-config-holder.update', {
    count: 1,
  });
  t.is(acknowledge, true);
  // wait before config update is done
  await configIsUpdated;
  // then wait until autobot has reloaded his config
  await new Promise((res) => autobot.on('started', res));
};

const retrieveConfig = async (t) => {
  t.context.configHolderServiceBroker = new ServiceBroker({
    transporter: 'TCP',
    nodeID: `${uuid()}-dynamic-config-holder`,
    logLevel: { '**': 'warn' },
  });
  t.context.configHolderServiceBroker.createService({
    name: 'dynamic-config-holder',
    actions: {
      get: (context) => ({ count: context.meta.count || 0 }),
      update: {
        params: {
          count: 'number',
        },
        handler: async (context) => {
          context.meta.count = context.params.count;
          context.broker.broadcast('dynamic-config-holder.configurationUpdated', { count: context.meta.count });
          return {
            acknowledge: true,
          };
        },
      },
    },
  });
  await t.context.configHolderServiceBroker.start();
};

const checkConfig = async (t, autobot) => {
  const { count } = await autobot.call('describe-config.get');
  t.is(count, 0);
  await updateConfig(t, autobot);
  const result = await autobot.call('describe-config.get');
  t.is(result.count, 1);
};

const before = async (t, middlewareInstance) => {
  await retrieveConfig(t);
  const autobot = brokerAutobot({
    initialSettings: {
      foo: 'bar',
      transporter: 'TCP',
      nodeID: `${uuid()}-autobot`,
      logLevel: { '**': 'warn' },
      ...(middlewareInstance ? { middlewares: [middlewareInstance] } : {}),
    },
    settingsRetrievalAction: {
      serviceName: 'dynamic-config-holder',
      actionName: 'get',
    },
    settingsUpdateEvent: {
      throttling: 1e3,
      name: 'dynamic-config-holder.configurationUpdated',
    },
    schemaFactories: [describeConfigFactory],
  });
  await autobot.start();
  return autobot;
};

test('Autobot should update on signal received', async (t) => {
  const autobot = await before(t);
  t.plan(3);
  await checkConfig(t, autobot);
  await autobot.stop();
});

test('Autobot should update on signal received with middlewares', async (t) => {
  const autobot = await before(t, middleware(t));
  t.plan(3);
  await checkConfig(t, autobot);
  await autobot.stop();
});
