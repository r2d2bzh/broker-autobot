const test = require('ava');
const { ServiceBroker } = require('moleculer');
const { v4: uuid } = require('uuid');
const brokerAutobot = require('../src');
const { describeConfigFactory } = require('./helpers/utils');

const retrieveConfig = async (t) => {
  t.context.configHolderService = new ServiceBroker({
    transporter: 'TCP',
    nodeID: `${uuid()}-config-holder`,
  });
  t.context.configHolderService.createService({
    name: 'config-holder',
    actions: {
      get: (context) => ({ count: context.meta.count || 0 }),
      update: {
        params: {
          count: 'number',
        },
        handler: async (context) => {
          context.meta.count = context.params.count;
          context.broker.broadcast('config-holder.configurationUpdated', { count: context.meta.count });
          return {
            acknowledge: true,
          };
        },
      },
    },
  });
  await t.context.configHolderService.start();
};

test.before(async (t) => {
  await retrieveConfig(t);
  t.context.autobot = await brokerAutobot({
    initialSettings: {
      foo: 'bar',
      transporter: 'TCP',
      nodeID: `${uuid()}-autobot`,
    },
    retrieveAction: {
      serviceName: 'config-holder',
      actionName: 'get',
    },
    updateEvent: {
      name: 'config-holder.configurationUpdated',
    },
    schemaFactories: [describeConfigFactory],
  });
  await t.context.autobot.start();
});

test.after.always(async (t) => {
  await t.context.autobot.stop();
});

test('Autobot should update on signal received', async (t) => {
  t.plan(3);
  const { count } = await t.context.autobot.call('describe-config.get');
  t.is(count, 0);

  const p = new Promise((res) => t.context.autobot.on('config-update', res));

  const { acknowledge } = await t.context.configHolderService.call('config-holder.update', { count: 1 });
  t.is(acknowledge, true);

  await p;
  const result = await t.context.autobot.call('describe-config.get');
  t.is(result.count, 1);
});
