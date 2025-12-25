// Taut Client (the plugin manager)
// Runs in the browser page context
// Loads and manages plugins via TautBridge

import { findExport, findByProps, commonModules } from './webpack'
import { findComponent, patchComponent } from './react'
import { addSettingsTab } from './settings'
import { setStyle, removeStyle } from './css'
import { TypedEventTarget } from './helpers'

import {
  TautPlugin,
  type TautPluginConstructor,
  type TautPluginConfig,
} from '../Plugin'
import type { TautBridge } from '../shared/TautBridge'
import type { ConfigStore } from '../shared/ConfigStore'

const global = globalThis as any
global.TautPlugin = TautPlugin

export const TautAPI = {
  setStyle,
  removeStyle,
  findExport,
  findByProps,
  findComponent,
  patchComponent,
  commonModules,
  fetch: (input: RequestInfo | URL, init?: RequestInit) =>
    window.TautBridge.fetch(input, init),
}
export type TautAPI = typeof TautAPI
global.TautAPI = TautAPI

export class PluginManager extends TypedEventTarget<{
  pluginInfoChanged: PluginInfo
}> {
  plugins = new Map<
    string,
    {
      PluginClass: TautPluginConstructor
      instance: TautPlugin | null
    }
  >()

  constructor(
    protected bridge: TautBridge,
    protected configStore: ConfigStore
  ) {
    super()

    this.bridge.onPluginCode((name, code) => {
      this.loadPluginCode(name, code)
    })

    this.configStore.onConfigChange((newConfig) => {
      for (const [name, pluginConfig] of Object.entries(newConfig.plugins)) {
        this.updatePluginConfig(name, pluginConfig)
      }
    })
  }

  loadPluginCode(name: string, code: string): boolean {
    console.log(`[Taut] Loading plugin: ${name}`)

    try {
      const config = this.configStore.getConfig().plugins[name]

      const PluginClass = new Function(
        `return (${code}).default`
      )() as TautPluginConstructor

      if (
        typeof PluginClass !== 'function' ||
        !(PluginClass.prototype instanceof TautPlugin)
      ) {
        throw new Error(`Plugin class ${name} does not extend TautPlugin`)
      }

      const existing = this.plugins.get(name)
      if (existing && existing.instance) {
        try {
          existing.instance.stop()
        } catch (err) {
          console.error(`[Taut] Error stopping existing plugin ${name}:`, err)
        }
      }

      let instance: TautPlugin | null = null

      if (config.enabled) {
        try {
          instance = new PluginClass(TautAPI, config)
          instance.start()
          console.log(`[Taut] Plugin ${name} started successfully`)
        } catch (err) {
          console.error(`[Taut] Error starting plugin ${name}:`, err)
        }
      }

      this.plugins.set(name, { PluginClass, instance })
      this.emit('pluginInfoChanged', this.getPluginInfo())
      console.log(`[Taut] Plugin ${name} loaded`)
      return true
    } catch (err) {
      console.error(`[Taut] Plugin ${name} failed to load:`, err)
      return false
    }
  }

  updatePluginConfig(name: string, newConfig: TautPluginConfig) {
    console.log(`[Taut] Updating config for plugin: ${name}`)

    const existing = this.plugins.get(name)
    if (!existing) {
      console.warn(`[Taut] Plugin ${name} not loaded, cannot update config`)
      return
    }

    if (existing.instance) {
      try {
        existing.instance.stop()
      } catch (err) {
        console.error(`[Taut] Error stopping plugin ${name}:`, err)
      }
      existing.instance = null
    }

    let instance: TautPlugin | null = null

    if (newConfig.enabled) {
      try {
        instance = new existing.PluginClass(TautAPI, newConfig)
        instance.start()
        console.log(
          `[Taut] Plugin ${name} started successfully with new config`
        )
      } catch (err) {
        console.error(
          `[Taut] Error starting plugin ${name} with new config:`,
          err
        )
      }
    }

    this.plugins.set(name, {
      PluginClass: existing.PluginClass,
      instance,
    })

    this.emit('pluginInfoChanged', this.getPluginInfo())
    console.log(`[Taut] Plugin ${name} config updated`)
  }

  getPluginInfo() {
    return [...this.plugins.entries()].map(([id, plugin]) => ({
      id,
      name: plugin.PluginClass.pluginName,
      description: plugin.PluginClass.description,
      authors: plugin.PluginClass.authors,
      enabled: plugin.instance !== null,
    }))
  }
}
export type PluginInfo = ReturnType<PluginManager['getPluginInfo']>
