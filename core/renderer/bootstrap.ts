// Taut Bootstrap
// Main entry point for Taut initialization in both Electron and Userscript
// Wires up the backend, config store, and waits for Slack to be ready

import { ConfigStore } from '../shared/ConfigStore'
// @ts-ignore
import * as deps from './deps/deps.bundle.js'
const { jsonc } = deps as typeof import('./deps')

import type { TautBridge } from '../shared/TautBridge'

const global = globalThis as any

export interface BootstrapDeps {
  bridge: TautBridge
}

const windowLoadPromise = new Promise<void>((resolve) => {
  if (document.readyState === 'complete') {
    resolve()
  } else {
    window.addEventListener('load', () => resolve(), { once: true })
  }
})

/**
 * Main entry point for Taut initialization.
 * Called from both Electron preload and userscript bootstrap.
 */
export async function bootstrap(
  bridge: TautBridge = global.TautBridge
): Promise<void> {
  if (!bridge) {
    console.error('[Taut] TautBridge not found')
    return
  }

  console.log('[Taut] Bootstrap starting...')

  await bridge.start()

  const configStore = new ConfigStore(bridge, jsonc)
  await configStore.init()
  console.log('[Taut] ConfigStore initialized', configStore)
  global.configStore = configStore

  console.log('[Taut] Monaco editor loaded from bundle')

  // Wait for Slack to be ready (DOM loaded)
  await windowLoadPromise

  console.log('[Taut] Slack loaded, initializing...')

  // Initialize plugins

  const { PluginManager } = await import('./pluginManager')
  const pluginManager = new PluginManager(bridge, configStore)
  global.__tautPluginManager = pluginManager
  bridge.startPlugins()

  // Setup settings tab

  const { addSettingsTab } = await import('./settings')
  addSettingsTab(pluginManager, configStore)

  console.log('[Taut] Taut initialized')
}
