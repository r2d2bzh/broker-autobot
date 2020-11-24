/**
  @typedef {{
    initial?: any
    current?: any
    overload?: any
  }} settings
 */

/**
* @typedef {'starting' | 'started' | 'stopping' | 'stopped'} state;
*/

/**
  @typedef {{
    nodeID: () => string
    log: () => import('moleculer').LoggerInstance
    emit: {(name: string, context: any)=> void}
    start: () => Promise<void>
    stop: () => Promise<void>
    setState: (state: state) => void
    getState: () => state
    newSettings: (newSettings: settings) => void
    createService: (schema) => void
    call: (schema) => Promise<any>
    waitForServices: (services: Array<string>) => Promise<void>
  }} brokerShell
 */

/** @typedef {{ name?: string; predicate?: (param?: any) => boolean }} settingsUpdateEvent */

/** @typedef { () => import('moleculer').ServiceSchema} schemaFactory */

/**
  @typedef { import('events').EventEmitter & {
    start: (settings?:settings) => Promise<void>
    stop: () => Promise<void>
    log: () => import('moleculer').LoggerInstance
    call: (name:string, options: any) => Promise<any>
    waitForServices: (serviceNames: string[]) => Promise<void>
  }} brokerRevolver
*/

/**
  @typedef {{
    serviceName?: string
    actionName?: string
    params?: any
    parser?: (param?: any) => any
    isStreamed?: boolean
  }} settingsRetrieveAction
 */

/**
  @typedef {{
    initialSettings?: any
    settingsOverload?: any
    settingsRetrieveAction?: settingsRetrieveAction
    settingsUpdateEvent?: settingsUpdateEvent
    schemaFactories?: schemaFactory[]
  }} autobotOptions
 */
