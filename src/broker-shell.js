/// <reference path="types.js" />
// @ts-check
const { ServiceBroker } = require('moleculer');
const merge = require('lodash.merge');
const { STOPPED, STARTING, STARTED, STOPPING } = require('./states');

/**
 * @param {settings} param0
 */
const createBroker = ({ initial, current, overload }) => new ServiceBroker(merge({}, initial, current, overload));

/**
 * Manage the broker state
 * @param {settings} settings
 * @param {(name:string) => void} emit
 * @returns {brokerShell}
 */
const newBrokerShell = (settings, emit) => {
  const inside = {
    state: STOPPED,
    broker: createBroker(settings),
  };
  /** @param {state} newState */
  const setState = (newState) => {
    inside.state = newState;
    emit(newState);
  };
  const log = () => inside.broker.getLogger('autobot');
  return {
    nodeID: () => inside.broker.nodeID,
    start: (addServices) => async () => {
      if (inside.state === STOPPED) {
        setState(STARTING);
        inside.broker = createBroker(settings);
        addServices();
        await inside.broker.start();
        setState(STARTED);
      } else {
        log().warn(`Cannot start, autobot is ${inside.state}`);
      }
    },
    stop: async () => {
      if (inside.state === STARTED) {
        setState(STOPPING);
        await inside.broker.stop();
        setState(STOPPED);
      } else {
        log().warn(`Cannot stop, autobot is ${inside.state}`);
      }
    },
    call: (...args) => inside.broker.call(...args),
    waitForServices: (...args) => inside.broker.waitForServices(...args),
    createService: (schema) => inside.broker.createService(schema),
    log,
  };
};

module.exports = newBrokerShell;
