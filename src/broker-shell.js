/// <reference path="types.js" />
// @ts-check
const { ServiceBroker } = require('moleculer');
const merge = require('lodash.merge');
const { STOPPED } = require('./constants');

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
  return {
    nodeID: () => inside.broker.nodeID,
    start: () => inside.broker.start(),
    stop: () => inside.broker.stop(),
    setState: (newState) => {
      inside.state = newState;
      log().info(`Autobot is ${inside.state}`);
    },
    getState: () => inside.state,
    call: (...args) => inside.broker.call(...args),
    waitForServices: (...args) => inside.broker.waitForServices(...args),
    createService: (schema) => inside.broker.createService(schema),
    newSettings: (newSettings) => {
      if (inside.state !== STOPPED) {
        // This can only occur in case of an autobot misconception.
        throw new Error(`Cannot create broker when state is ${inside.state}`);
      }
      inside.broker = createBroker(newSettings);
    },
    log,
  };
};

module.exports = newBrokerShell;
