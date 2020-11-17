const brokerAutobot = require('../src');
const test = require('ava');
const { ServiceBroker } = require('moleculer');
const { v4: uuid } = require('uuid');

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

const startRetrieveActionBroker = async ()=> {
  const retrieveAction = () => ({
    name: 'retrieve-action',
    actions: {
      get: {
        handler: (context) => {
          return {
            dynamicConfig: true
          }
        },
      },
    },
  });
  const serviceBroker = new ServiceBroker({
    transporter: 'NATS',
    nodeID: uuid() + '-test-service'
  });
  serviceBroker.createService(retrieveAction());
  await serviceBroker.start();
  await serviceBroker.waitForServices(['retrieve-action']);
}

test.before(async (t) => {
  await startRetrieveActionBroker();
  const autobot = await brokerAutobot({
    init: {
      foo: 'bar',
      transporter: 'NATS',
      nodeID: uuid() + '-autobot'
    },
    retrieveAction: {
      name: 'retrieve-action.get'
    },
    schemaFactories: [describeConfig],
  });
  await autobot.start();
  t.context.autobotContext = autobot.context;
});

test('fetch config from retrieve action', async t => {
  const { nodeID, ...config } = await t.context.autobotContext.broker.call('describe-config.get');
  t.snapshot(config);
});
