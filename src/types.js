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
    start: (addServices: (log, createService, nodeID) => void) => () => Promise<void>
    stop: () => Promise<void>
    createService: (schema) => void
    call: (schema) => Promise<any>
    waitForServices: (services: Array<string>) => Promise<void>
  }} brokerShell
 */

/** @typedef {{ name?: string; throttling?: number; predicate?: (param?: any) => boolean }} settingsUpdateEvent */

/** @typedef {{ name: string; throttling?: number; predicate?: (param?: any) => boolean }} newSettingsUpdateEvent */

/** @typedef { () => import('moleculer').ServiceSchema} schemaFactory */

/**
  @typedef { import('events').EventEmitter & {
    nodeID: () => string
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
  }} settingsRetrievalAction
 */

/**
  @typedef {{
    initialSettings?: any
    settingsOverload?: any
    settingsRetrievalAction?: settingsRetrievalAction
    settingsUpdateEvent?: settingsUpdateEvent
    schemaFactories?: schemaFactory[]
  }} autobotOptions
 */
