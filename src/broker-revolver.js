/// <reference path="types.js" />
// @ts-check
const { EventEmitter } = require('events');
const newBrokerShell = require('./broker-shell');
const throttle = require('lodash.throttle');

/**
 * @param {newSettingsUpdateEvent} settingsUpdateEvent
 * @param {() => import('moleculer').LoggerInstance} log
 * @param {Function} nodeID
 * @param {Function} emit
 */
const newUpdateServiceSchema = ({ name, throttling = 30e3, predicate = () => true }, log, nodeID, emit) => ({
  name: `autobot-updater-${nodeID()}`,
  created() {
    this.emitUpdate = throttle((ctx) => emit('config-update', ctx), throttling);
  },
  events: {
    [name]: {
      handler(ctx) {
        if (predicate(ctx)) {
          log().info(`Event ${ctx.eventName} received`);
          this.emitUpdate(ctx);
        }
      },
    },
  },
});

const addServices = ({ settingsUpdateEvent, schemaFactories, emit }) => (log, createService, nodeID) => {
  if (settingsUpdateEvent.name) {
    log().info(`Subscribing to ${settingsUpdateEvent.name} event`);
    createService(newUpdateServiceSchema(settingsUpdateEvent, log, nodeID, emit));
  }
  schemaFactories.forEach((schemaFactory) => {
    const schema = schemaFactory();
    log().info(`Creating service ${schema.name}`);
    createService(schema);
    return schema.name;
  });
};

/**
 * @returns {brokerRevolver}
  @param {{
    settingsUpdateEvent: settingsUpdateEvent, schemaFactories: schemaFactory[]
  }} brokerRevolverOptions
 */
const newBrokerRevolver = ({ settingsUpdateEvent, schemaFactories }) => {
  /** @type {any} */
  const brokerRevolver = new EventEmitter();
  const emit = brokerRevolver.emit.bind(brokerRevolver);

  const brokerShell = newBrokerShell(emit);

  brokerRevolver.start = brokerShell.start(
    addServices({
      settingsUpdateEvent,
      emit,
      schemaFactories,
    })
  );

  ['call', 'waitForServices', 'log', 'nodeID', 'stop'].forEach((method) => {
    brokerRevolver[method] = brokerShell[method];
  });
  return brokerRevolver;
};

module.exports = newBrokerRevolver;
