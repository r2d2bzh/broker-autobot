/// <reference path="types.js" />
// @ts-check
const { ServiceBroker } = require('moleculer');
const merge = require('lodash.merge');
const { STOPPED, STARTING, STARTED, STOPPING } = require('./constants');

/**
 * @param {settings} param0
 */
const createBroker = ({ initial, current, overload }) =>
  new ServiceBroker(merge({}, initial, current, overload));

/**
 * Manage the broker state
 * @param {settings} settings
 * @returns {brokerShell}
 */
const newBrokerShell = (settings) => {
  const inside = {
    state: STOPPED,
    broker: createBroker(settings),
  };
  const log = () => inside.broker.getLogger('autobot');
  const newSettings = (brokerSettings) => {
    if (inside.state !== STOPPED) {
      // This can only occur in case of an autobot misconception.
      throw new Error(`Cannot create broker when state is ${inside.state}`);
    }
    inside.broker = createBroker(brokerSettings);
  };
  return {
    nodeID: () => inside.broker.nodeID,
    start: (addServices) => async () => {
      if (inside.state === STOPPED) {
        newSettings(settings);
        inside.state = STARTING;
        addServices();
        await inside.broker.start();
        inside.state = STARTED;
      } else {
        log().warn(`Cannot start, autobot is ${inside.state}`);
      }
    },
    stop: async () => {
      if (inside.state === STARTED) {
        inside.state = STOPPING;
        await inside.broker.stop();
        inside.state = STOPPED;
      } else {
        log().warn(`Cannot stop, autobot is ${inside.state}`);
      }
    },
    call: (...args) => inside.broker.call(...args),
    waitForServices: (...args) => inside.broker.waitForServices(...args),
    createService: (schema) => inside.broker.createService(schema),
    newSettings,
    log,
  };
};

module.exports = newBrokerShell;
