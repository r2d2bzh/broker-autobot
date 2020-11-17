const EventEmitter = require('events');
const { ServiceBroker } = require('moleculer');
const getStream = require('get-stream');
const merge = require('lodash.merge');

const identity = (x) => x;

/**
 * @param callable broker or moleculer context
 */
const retrieveSettings = async (callable, { serviceName, actionName, params = {}, isStreamed = false, parser = identity }, logger) => {
  if (serviceName && actionName) {
    const config = await (isStreamed ? getStream : identity)(await callable.call(`${serviceName}.${actionName}`, params));
    logger.info('Settings retrieved:', config);
    return parser(config);
  } else {
    logger.info('No retrieve settings action defined');
    return {};
  }
}

const updateService = ({name, predicate = () => true}, emitter) => ({
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

const starter = (context, logger) => async () => {
  if (!context.started) {
    logger.info('Starting autobot');
    context.broker = createBroker(context.initialSettings, context.settings, context.overload);
    if (context.updateEvent.name) {
      context.broker.createService(updateService(context.updateEvent, context.settingsModification));
    }
    context.schemaFactories.forEach(factory => {
      const schema = factory();
      logger.info(`Creating service ${schema.name}`);
      context.broker.createService(schema);
    });
    await context.broker.start();
    context.started = true;
  } else {
    logger.info('Autobot already started');
  }
};

module.exports = async ({
  init = {},
  overload = {},
  retrieveAction = {},
  schemaFactories = [],
  updateEvent = {},
} = {}) => {
  const initialSettings = merge({
    ...(process.env.TRANSPORTER ? { transporter: process.env.TRANSPORTER } : {}),
    ...(process.env.NAMESPACE ? { namespace: process.env.NAMESPACE } : {}),
  }, init);
  const context = {
    overload,
    schemaFactories,
    updateEvent,
    broker: createBroker(initialSettings, overload),
    initialSettings,
    settings: {},
    settingsModification: new EventEmitter(),
    started: false,
  };
  const logger = context.broker.getLogger('autobot');
  const start = starter(context, logger);

  await context.broker.start();
  if(retrieveAction.serviceName) {
    await context.broker.waitForServices([retrieveAction.serviceName]);
  }
  context.settings = await retrieveSettings(context.broker, retrieveAction, logger);
  await context.broker.stop();

  context.settingsModification.on('update', async (ctx) => {
    context.settings = await retrieveSettings(ctx, retrieveAction, logger);
    // TODO: deal with restart priorities between multiple brokers
    await context.broker.stop();
    await start();
  });

  // const exposedBrokerMethods = ['call', 'stop', 'waitForServices'];
  // ...Object.fromEntries(exposedBrokerMethods.map(name => [name, context.broker[name].bind(context.broker)])),

  return {
    start,
    stop: () => context.broker.stop(),
    call: (...args) => context.broker.call(...args),
    waitForServices: (...args) => context.broker.waitForServices(...args),
  };
};
