/// <reference path="types.js" />
// @ts-check
const getStream = require('get-stream');
const merge = require('lodash.merge');
const newBrokerRevolver = require('./broker-revolver');
const sleep = require('util').promisify(setTimeout);
const identity = (x) => x;

/**
 * @param {brokerRevolver} brokerRevolver
 * @param {settingsRetrievalAction} param1
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
const onConfigUpdate = ({ stop, start, log, updateWindowSize }) => async (ctx) => {
  log().info(`Update event ${ctx.eventName} received`);
  await sleep(Math.random() * updateWindowSize);
  await stop();
  await start(ctx.params);
  log().info('Settings are updated:', ctx.params);
};

/**
 * @param {autobotOptions} AutobotOptions
 */
module.exports = ({
  initialSettings = {},
  settingsOverload = {},
  settingsRetrievalAction = {},
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
    settingsUpdateEvent,
    schemaFactories,
  });

  const start = async (currentSettings) => {
    if (!currentSettings && settingsRetrievalAction.serviceName) {
      await brokerRevolver.start(settings);
      await brokerRevolver.waitForServices([settingsRetrievalAction.serviceName]);
      settings.current = await retrieveSettings(brokerRevolver, settingsRetrievalAction);
      await brokerRevolver.stop();
    } else {
      settings.current = currentSettings;
    }
    await brokerRevolver.start(settings);
  };

  const exposedBrokerRevolverMethods = Object.fromEntries(
    ['call', 'stop', 'waitForServices', 'nodeID', 'getLogger'].map((name) => [name, brokerRevolver[name]])
  );
  // settingsUpdateEvent
  brokerRevolver.on(
    'config-update',
    onConfigUpdate({
      stop: exposedBrokerRevolverMethods.stop,
      start,
      updateWindowSize: (settingsUpdateEvent.throttling || 30e3) * 0.75,
      log: brokerRevolver.log,
    })
  );

  return {
    ...exposedBrokerRevolverMethods,
    start,
    on: (...args) => brokerRevolver.on(...args),
  };
};
