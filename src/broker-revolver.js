const EventEmitter = require('events');
const merge = require('lodash.merge');
const { ServiceBroker } = require('moleculer');

/**
 * @param {settings} param0
 */
const createBroker = ({ initial, current, overload }) =>
  new ServiceBroker(merge({}, initial, current, overload));

const newUpdateServiceSchema = (
  { name, predicate = () => true },
  brokerShell,
) => ({
  name: `autobot-updater-${brokerShell.nodeID()}`,
  events: {
    [name]: {
      group: 'config-holder',
      handler: (ctx) => {
        if (predicate(ctx)) {
          brokerShell.log().info(`Event ${ctx.eventName} received`);
          // TODO debounce (limit to 1 event in 30s)
          brokerShell.emit('config-update', ctx);
        }
      },
    },
  },
});

/**
 * @param {{brokerShell:brokerShell, schemaFactories, settingsUpdateEvent}} param0
 */
const starter = ({
  brokerShell,
  schemaFactories,
  settingsUpdateEvent,
}) => async (settings) => {
  if (brokerShell.getState() === 'stopped') {
    brokerShell.newSettings(settings);
    brokerShell.setState('starting');
    if (settingsUpdateEvent.name) {
      brokerShell
        .log()
        .info(`Subscribing to ${settingsUpdateEvent.name} event`);
      brokerShell.createService(
        newUpdateServiceSchema(settingsUpdateEvent, brokerShell),
      );
    }
    schemaFactories.forEach((schemaFactory) => {
      const schema = schemaFactory();
      brokerShell.log().info(`Creating service ${schema.name}`);
      brokerShell.createService(schema);
      return schema.name;
    });
    await brokerShell.start();
    brokerShell.setState('started');
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
  if (brokerShell.getState() === 'started') {
    brokerShell.setState('stopping');
    await brokerShell.stop();
    brokerShell.setState('stopped');
  } else {
    brokerShell.log().warn(`Cannot stop, autobot is ${brokerShell.getState()}`);
  }
};

/**
 * Manage the broker state
 * @typedef {'starting' | 'started' | 'stopping' | 'stopped'} state
 * @typedef {Object} brokerShell
 * @property {()=> string} nodeID
 * @property {(params: any) => void} log
 * @property {()=> string} emit
 * @property {()=> Promise<void>} start
 * @property {()=> Promise<void>} stop
 * @property {(state:state)=> void} setState
 * @property {()=> state} getState
 * @property {(newSettings)=> void} newSettings
 * @property {(schema) => void} createService
 * @property {(schema) => Promise<any>} call
 * @property {(services: Array<string>) => Promise<void>} waitForServices
 * @typedef {{initial, current, overload}} settings
 * @param {settings} settings
 * @param {*} emit
 */
const newBrokerShell = (settings, emit) => {
  const inside = {
    /** @type {state} */
    state: 'stopped',
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
      emit('state', inside.state);
    },
    getState: () => inside.state,
    call: (...args) => inside.broker.call(...args),
    waitForServices: (...args) => inside.broker.waitForServices(...args),
    createService: (schema) => inside.broker.createService(schema),
    newSettings: (newSettings) => {
      if (inside.state !== 'stopped') {
        // This can only occur in case of an autobot misconception.
        throw new Error(`Cannot create broker when state is ${inside.state}`);
      }
      inside.broker = createBroker(newSettings);
    },
    emit,
    log,
  };
};

/**
 * @returns {{ start: ()=> Promise<void>, stop: ()=> Promise<void>,log: () => void }}
 * @param {*} param0
 */
const newBrokerRevolver = ({
  settings,
  settingsUpdateEvent,
  schemaFactories,
}) => {
  const brokerRevolver = new EventEmitter();
  const emit = brokerRevolver.emit.bind(brokerRevolver);

  const brokerShell = newBrokerShell(settings, emit);

  brokerRevolver.start = starter({
    emit,
    brokerShell,
    schemaFactories,
    settingsUpdateEvent,
  });
  brokerRevolver.stop = stopper(brokerShell);
  brokerRevolver.log = (...args) => brokerShell.log(...args);

  ['call', 'waitForServices'].forEach((method) => {
    brokerRevolver[method] = (...args) => brokerShell[method](...args);
  });
  return brokerRevolver;
};

module.exports = newBrokerRevolver;
