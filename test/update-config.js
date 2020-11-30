// @ts-check
const test = require('ava');
const { ServiceBroker } = require('moleculer');
const { v4: uuid } = require('uuid');
const brokerAutobot = require('../src');
const { describeConfigFactory } = require('./helpers/utils');

const updateConfig = async (t) => {
  const configIsUpdated = new Promise((res) => t.context.autobot.on('config-update', res));
  await t.context.configHolderServiceBroker.waitForServices(`autobot-updater-${t.context.autobot.nodeID()}`);
  const { acknowledge } = await t.context.configHolderServiceBroker.call('dynamic-config-holder.update', {
    count: 1,
  });
  t.is(acknowledge, true);
  // wait before config update is done
  await configIsUpdated;
  // then wait until autobot has reloaded his config
  await new Promise((res) => t.context.autobot.on('started', res));
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

test.before(async (t) => {
  await retrieveConfig(t);
  const autobot = await brokerAutobot({
    initialSettings: {
      foo: 'bar',
      transporter: 'TCP',
      nodeID: `${uuid()}-autobot`,
      logLevel: { '**': 'warn' },
    },
    settingsRetrieveAction: {
      serviceName: 'dynamic-config-holder',
      actionName: 'get',
    },
    settingsUpdateEvent: {
      name: 'dynamic-config-holder.configurationUpdated',
    },
    schemaFactories: [describeConfigFactory],
  });
  await autobot.start();
  // @ts-ignore
  t.context.autobot = autobot;
});

test.after.always(async (t) => {
  await t.context.autobot.stop();
});

test('Autobot should update on signal received', async (t) => {
  t.plan(3);
  const { count } = await t.context.autobot.call('describe-config.get');
  t.is(count, 0);
  await updateConfig(t);
  const result = await t.context.autobot.call('describe-config.get');
  t.is(result.count, 1);
});
