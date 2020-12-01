/// <reference path="types.js" />
// @ts-check
const { EventEmitter } = require('events');
const newBrokerShell = require('./broker-shell');
const throttle = require('lodash.throttle');

/**
 * @param {settingsUpdateEvent} settingsUpdateEvent
 * @param {brokerShell} brokerShell
 * @param {function} emit
 */
const newUpdateServiceSchema = ({ name, throttling = 30e3, predicate = () => true }, brokerShell, emit) => ({
  name: `autobot-updater-${brokerShell.nodeID()}`,
  created() {
    this.emitUpdate = throttle((ctx) => emit('config-update', ctx), throttling);
  },
  events: {
    [name]: {
      handler(ctx) {
        if (predicate(ctx)) {
          brokerShell.log().info(`Event ${ctx.eventName} received`);
          this.emitUpdate(ctx);
        }
      },
    },
  },
});

const addServices = ({ settingsUpdateEvent, brokerShell, schemaFactories, emit }) => () => {
  if (settingsUpdateEvent.name) {
    brokerShell.log().info(`Subscribing to ${settingsUpdateEvent.name} event`);
    brokerShell.createService(newUpdateServiceSchema(settingsUpdateEvent, brokerShell, emit));
  }
  schemaFactories.forEach((schemaFactory) => {
    const schema = schemaFactory();
    brokerShell.log().info(`Creating service ${schema.name}`);
    brokerShell.createService(schema);
    return schema.name;
  });
};

/**
 * @returns {brokerRevolver}
  @param {{
    settings: settings, settingsUpdateEvent: settingsUpdateEvent, schemaFactories: schemaFactory[]
  }} brokerRevolverOptions
 */
const newBrokerRevolver = ({ settings, settingsUpdateEvent, schemaFactories }) => {
  /** @type {any} */
  const brokerRevolver = new EventEmitter();
  const emit = brokerRevolver.emit.bind(brokerRevolver);

  const brokerShell = newBrokerShell(settings, emit);

  brokerRevolver.start = brokerShell.start(
    addServices({
      settingsUpdateEvent,
      emit,
      brokerShell,
      schemaFactories,
    })
  );

  ['call', 'waitForServices', 'log', 'nodeID', 'stop'].forEach((method) => {
    brokerRevolver[method] = brokerShell[method];
  });
  return brokerRevolver;
};

module.exports = newBrokerRevolver;
