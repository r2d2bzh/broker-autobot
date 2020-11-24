/// <reference path="types.js" />
// @ts-check
const { EventEmitter } = require('events');
const newBrokerShell = require('./broker-shell');
const { STARTING, STOPPING, STOPPED, STARTED } = require('./constants');

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
        console.log('received update signal');
        if (predicate(ctx)) {
          brokerShell.log().info(`Event ${ctx.eventName} received`);
          // TODO debounce (limit to 1 event in 30s)
          emit('config-update', ctx);
        }
      },
    },
  },
});

/**
  @param {{
    brokerShell:brokerShell,
    schemaFactories: schemaFactory[],
    settingsUpdateEvent: settingsUpdateEvent,
    emit: () => void
  }} staterOptions
 */
const starter = ({
  brokerShell,
  emit,
  schemaFactories,
  settingsUpdateEvent,
}) => /** @param {settings} settings */ async (settings) => {
  if (brokerShell.getState() === STOPPED) {
    brokerShell.newSettings(settings);
    brokerShell.setState(STARTING);
    if (settingsUpdateEvent.name) {
      brokerShell
        .log()
        .info(`Subscribing to ${settingsUpdateEvent.name} event`);
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
    await brokerShell.start();
    brokerShell.setState(STARTED);
  } else {
    brokerShell
      .log()
      .warn(`Cannot start, autobot is ${brokerShell.getState()}`);
  }
};

/**
 * @param {brokerShell} brokerShell
 */
const stopper = (brokerShell) => async () => {
  if (brokerShell.getState() === STARTED) {
    brokerShell.setState(STOPPING);
    await brokerShell.stop();
    brokerShell.setState(STOPPED);
  } else {
    brokerShell.log().warn(`Cannot stop, autobot is ${brokerShell.getState()}`);
  }
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

  brokerRevolver.start = starter({
    brokerShell,
    emit,
    schemaFactories,
    settingsUpdateEvent,
  });
  brokerRevolver.stop = stopper(brokerShell);
  ['call', 'waitForServices', 'log', 'nodeID'].forEach((method) => {
    brokerRevolver[method] = (...args) => brokerShell[method](...args);
  });
  return brokerRevolver;
};

module.exports = newBrokerRevolver;
