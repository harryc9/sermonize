/**
 * next-safe-action client setup and error helpers.
 */
import { createSafeActionClient, DEFAULT_SERVER_ERROR_MESSAGE } from 'next-safe-action'

export const actionClient = createSafeActionClient({
  handleServerError(e) {
    if (e instanceof ActionError) return e.message
    return DEFAULT_SERVER_ERROR_MESSAGE
  },
})

export class ActionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ActionError'
  }
}

export function throwActionError(message: string): never {
  throw new ActionError(message)
}
