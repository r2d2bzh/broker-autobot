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
        ...(process.env.BROKER_AUTOBOT_TRANSPORTER ? { transporter: process.env.BROKER_AUTOBOT_TRANSPORTER } : {}),
        ...(process.env.BROKER_AUTOBOT_NAMESPACE ? { namespace: process.env.BROKER_AUTOBOT_NAMESPACE } : {}),
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

  const exposedBrokerResolverMethods = Object.fromEntries(
    ['call', 'stop', 'waitForServices', 'nodeID'].map((name) => [name, brokerRevolver[name]])
  );

  brokerRevolver.on('config-update', onConfigUpdate(exposedBrokerResolverMethods.stop, start, brokerRevolver.log));

  return {
    ...exposedBrokerResolverMethods,
    start,
    on: (...args) => brokerRevolver.on(...args),
  };
};
