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

  private cache = this.api.createCache<string | undefined>('user_pronouns', {
    ttl: 24 * 60 * 60 * 1000,
    maxSize: 5000,
  })

  private unpatchBaseMessageSender = () => {}

  start() {
    this.log('Started')

    this.cache.load()

    this.unpatchBaseMessageSender = this.api.patchComponent<{
      botId?: string
      userId?: string
      className?: string
    }>('BaseMessageSender', (OriginalBaseMessageSender) => (props) => {
      const userId = props.userId
      const [pronouns, setPronouns] = React.useState<string | undefined>(() => {
        if (!userId) return undefined
        return this.cache.get(userId)
      })

      React.useEffect(() => {
        if (!userId) return
        const state = (
          Object.values(
            this.api.findExport(
              (exp) =>
                typeof exp == 'function' && exp.name === 'getStoreInstanceMap'
            )()
          )[0] as any
        )?.getState()
        const pronouns = state?.members?.[userId]?.profile?.pronouns?.trim()
        if (pronouns) setPronouns(pronouns)
        else console.log('No pronouns found for', userId)
      }, [userId])

      return (
        <>
          <OriginalBaseMessageSender {...props} className={props.className} />
          {pronouns && (
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
