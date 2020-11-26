/// <reference path="types.js" />
// @ts-check
const { EventEmitter } = require('events');
const newBrokerShell = require('./broker-shell');

/**
 * @param {settingsUpdateEvent} settingsUpdateEvent
 * @param {brokerShell} brokerShell
 * @param {function} emit
 */
const newUpdateServiceSchema = (
  { name, predicate = () => true },
  brokerShell,
  emit,
) => ({
  name: `autobot-updater-${brokerShell.nodeID()}`,
  events: {
    [name]: {
      handler: (ctx) => {
        if (predicate(ctx)) {
          brokerShell.log().info(`Event ${ctx.eventName} received`);
          // TODO debounce (limit to 1 event in 30s)
          emit('config-update', ctx);
        }
      },
    },
  },
});

const addServices = ({
  settingsUpdateEvent,
  brokerShell,
  schemaFactories,
  emit,
}) => () => {
  if (settingsUpdateEvent.name) {
    brokerShell.log().info(`Subscribing to ${settingsUpdateEvent.name} event`);
    brokerShell.createService(
      newUpdateServiceSchema(settingsUpdateEvent, brokerShell, emit),
    );
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
    settings:settings, settingsUpdateEvent:settingsUpdateEvent, schemaFactories: schemaFactory[]
  }} brokerRevolverOptions
 */
const newBrokerRevolver = ({
  settings,
  settingsUpdateEvent,
  schemaFactories,
}) => {
  /** @type {any} */
  const brokerRevolver = new EventEmitter();
  const emit = brokerRevolver.emit.bind(brokerRevolver);

  const brokerShell = newBrokerShell(settings);

  brokerRevolver.start = brokerShell.start(
    addServices({
      settingsUpdateEvent,
      emit,
      brokerShell,
      schemaFactories,
    }),
  );
  brokerRevolver.stop = brokerShell.stop.bind(brokerRevolver);
  ['call', 'waitForServices', 'log', 'nodeID'].forEach((method) => {
    brokerRevolver[method] = (...args) => brokerShell[method](...args);
  });
  return brokerRevolver;
};

module.exports = newBrokerRevolver;
