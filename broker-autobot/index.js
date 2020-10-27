const EventEmitter = require('events');
const { ServiceBroker } = require('moleculer');
const getStream = require('get-stream');
const merge = require('lodash.merge');

const identity = (x) => x;

const retrieveSettings = async (callable, { name, params = {}, isStreamed = false, parser = identity }) => {
  if (name) {
    const config = await (isStreamed ? getStream : identity)(await callable.call(name, params));
    return parser(config);
  } else {
    return {};
  }
}

const updateService = ({name, predicate}, emitter) => ({
  name: `broker-autobot-${broker.nodeID}`,
  events: {
    [name]: (ctx) => {
      if(predicate(ctx)) {
        // TODO debounce (limit to 1 event in 30s)
        emitter.emit('update', ctx);
      }
    }
  }
});

const createBroker = (...args) => new ServiceBroker(merge({}, ...args));

const starter = (context) => async () => {
  if (!context.started) {
    context.broker = createBroker(context.initialSettings, context.settings, context.overload);
    if (context.updateEvent.name) {
      context.broker.createService(updateService(context.updateEvent, context.settingsModification));
    }
    context.schemaFactories.forEach(factory => context.broker.createService(factory()));
    await context.broker.start();
    context.started = true;
  }
};

module.exports = async ({
  init = {},
  overload = {},
  retrieveAction = {},
  schemaFactories = [],
  updateEvent = {},
} = {}) => {
  const context = {
    overload,
    schemaFactories,
    updateEvent,
    broker: createBroker(initialSettings, overload),
    initialSettings: merge({
      ...(process.env.TRANSPORTER ? { transporter: process.env.TRANSPORTER } : {}),
      ...(process.env.NAMESPACE ? { namespace: process.env.NAMESPACE } : {}),
    }, init),
    settings: {},
    settingsModification: new EventEmitter(),
    started: false,
  };
  const start = starter(context);

  await context.broker.start();
  settings = await retrieveSettings(context.broker, retrieveAction);
  await context.broker.stop();

  context.settingsModification.on('update', async (ctx) => {
    context.settings = await retrieveSettings(ctx, retrieveAction);
    // TODO: deal with restart priorities between multiple brokers
    await context.broker.stop();
    await start();
  });
  
  return start;
};
