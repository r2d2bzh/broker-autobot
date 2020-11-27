/// <reference path="types.js" />
// @ts-check
const getStream = require('get-stream');
const merge = require('lodash.merge');
const newBrokerRevolver = require('./broker-revolver');

const identity = (x) => x;

/**
 * @param {brokerRevolver} brokerRevolver
 * @param {settingsRetrieveAction} param1
 */
const retrieveSettings = async (
  brokerRevolver,
  { serviceName, actionName, params = {}, isStreamed = false, parser = identity }
) => {
  if (serviceName && actionName) {
    const config = await (isStreamed ? getStream : identity)(
      await brokerRevolver.call(`${serviceName}.${actionName}`, params)
    );
    brokerRevolver.log().info('Settings retrieved:', config);
    return parser(config);
  }
  brokerRevolver.log().info('No retrieve settings action defined');
  return {};
};

// TODO: deal with restart priorities between multiple brokers
const onConfigUpdate = (stop, start, log) => async (ctx) => {
  log().info(`Update event ${ctx.eventName} received`);
  await stop();
  await start(ctx.params);
  log().info('Settings are updated:', ctx.params);
};

/**
 * @param {autobotOptions} AutobotOptions
 */
module.exports = async ({
  initialSettings = {},
  settingsOverload = {},
  settingsRetrieveAction = {},
  settingsUpdateEvent = {},
  schemaFactories = [],
} = {}) => {
  const settings = {
    initial: merge(
      {
        ...(process.env.TRANSPORTER ? { transporter: process.env.TRANSPORTER } : {}),
        ...(process.env.NAMESPACE ? { namespace: process.env.NAMESPACE } : {}),
      },
      initialSettings
    ),
    /** @type {settings} */
    current: {},
    overload: settingsOverload,
  };

  const brokerRevolver = newBrokerRevolver({
    settings,
    settingsUpdateEvent,
    schemaFactories,
  });

  const start = async (currentSettings) => {
    if (!currentSettings && settingsRetrieveAction.serviceName) {
      await brokerRevolver.start(settings);
      await brokerRevolver.waitForServices([settingsRetrieveAction.serviceName]);
      settings.current = await retrieveSettings(brokerRevolver, settingsRetrieveAction);
      await brokerRevolver.stop();
    } else {
      settings.current = currentSettings;
    }
    await brokerRevolver.start(settings);
  };

  const stop = () => brokerRevolver.stop();

  brokerRevolver.on('config-update', onConfigUpdate(stop, start, brokerRevolver.log));

  // const exposedBrokerMethods = ['call', 'stop', 'waitForServices'];
  // ...Object.fromEntries(exposedBrokerMethods
  // .map(name => [name, context.broker[name].bind(context.broker)])),

  return {
    start,
    stop,
    call: (...args) => brokerRevolver.call(...args),
    waitForServices: (...args) => brokerRevolver.waitForServices(...args),
    on: (...args) => brokerRevolver.on(...args),
    nodeID: () => brokerRevolver.nodeID(),
  };
};
