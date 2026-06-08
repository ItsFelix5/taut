// Displays user pronouns next to their name

import { TautPlugin } from '$taut'

export default class UserPronouns extends TautPlugin {
  static readonly pluginName = 'User Pronouns'
  static readonly description = 'Displays user pronouns next to their name'
  static readonly defaultConfig = `
    // Displays user pronouns next to their name
    "UserPronouns": {
      "enabled": true
    }
  `
  static readonly authors = '<@U07AGEVSTD2>'
  private unpatchBaseMessageSender = () => {}

  start() {
    this.log('Started')
    const getState = (
      Object.values(
        this.api.findExport(
          (exp) =>
            typeof exp == 'function' && exp.name === 'getStoreInstanceMap'
        )()
      )[0] as any
    )?.getState

    this.unpatchBaseMessageSender = this.api.patchComponent<{
      visible: boolean
      userId: string
    }>('BaseMessageSender', (OriginalBaseMessageSender) => (props) => {
      const pronouns =
        getState()?.members?.[props.userId]?.profile?.pronouns?.trim()

      return (
        <>
          <OriginalBaseMessageSender {...props} />
          {props.visible && pronouns && (
            <>
              {'  '}
              <span className="c-timestamp c-timestamp__label">
                {pronouns + '  •'}
              </span>
            </>
          )}
        </>
      )
    })
  }

  stop() {
    this.unpatchBaseMessageSender()
    this.log('Stopped')
  }
}
