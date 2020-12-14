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
 * @param {(name:string) => void} emit
 * @returns {brokerShell}
 */
const newBrokerShell = (emit) => {
  const inside = {
    state: STOPPED,
    broker: new ServiceBroker(),
  };
  /** @param {state} newState */
  const setState = (newState) => {
    inside.state = newState;
    emit(newState);
  };
  const getLogger = (...args) => inside.broker.getLogger(...args);
  const log = () => getLogger('autobot');
  const createService = (schema) => inside.broker.createService(schema);
  const nodeID = () => inside.broker.nodeID;

  return {
    nodeID,
    start: (addServices) => async (settings) => {
      if (inside.state === STOPPED) {
        setState(STARTING);
        inside.broker = createBroker(settings);
        addServices(log, createService, nodeID);
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
    createService,
    getLogger,
    log,
  };
};

module.exports = newBrokerShell;
