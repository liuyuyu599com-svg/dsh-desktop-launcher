/**
 * The floating power trigger: a Windows-style shutdown icon button at the
 * bottom-right of the page. Clicking it opens a confirm dialog; the confirmed
 * request POSTs to the loopback-only /api/dsh-desktop-launcher/shutdown route,
 * and the host process exits gracefully (ctx.appExit) a beat after the
 * response.
 */
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { closeCurrentPage, requestRestart, requestShutdown } from './shutdown-api.ts'
import css from './shutdown.module.css'

/** The inject face the footer registration provides. */
export interface ShutdownEntryFace {
  /** Whether the confirm dialog is required before exiting (settings-backed). */
  confirmShutdown: () => boolean
  /** Whether the confirm dialog is required before restarting (settings-backed). */
  confirmRestart: () => boolean
}

/** Entry props: the column state + the locale seat + the face. */
export type ShutdownEntryProps =
  PropsLocale<'desktop-launcher'>
  & { wide: boolean; floating?: boolean }
  & InjectFace<ShutdownEntryFace>

/** Dialog view state. */
type View = 'closed' | 'confirm' | 'shutting-down' | 'restart-confirm' | 'restarting' | 'error'

/**
 * The Windows-style power icon (a circle with a vertical line at the top).
 * @param size - rendered side length.
 * @returns the icon element.
 */
function PowerIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M6.9 6.4A8.6 8.6 0 1 0 17.1 6.4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M12 3.5v7.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

/**
 * The circular-arrow restart icon.
 * @param size - rendered side length.
 * @returns the icon element.
 */
function RestartIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 3.5v3.6h3.6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Render the shutdown trigger and the confirm dialog.
 * @param props - column state, locale copy, and the confirm gate.
 * @returns the entry element tree.
 */
export function ShutdownEntry(props: ShutdownEntryProps) {
  const { t, wide, floating = false } = props
  const [view, setView] = useState<View>('closed')
  const [error, setError] = useState<string | undefined>(undefined)

  const close = useCallback(() => {
    setView(current => current === 'shutting-down' || current === 'restarting' ? current : 'closed')
  }, [])

  const performShutdown = useCallback(async () => {
    setError(undefined)
    setView('shutting-down')
    try {
      await requestShutdown()
      // The host acknowledges first and exits a beat later; close (or blank)
      // the page before the process goes away.
      closeCurrentPage()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
      setView('error')
    }
  }, [])

  const performRestart = useCallback(async () => {
    setError(undefined)
    setView('restarting')
    try {
      await requestRestart()
      closeCurrentPage()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
      setView('error')
    }
  }, [])

  const handleTrigger = useCallback(() => {
    if (props.confirmShutdown()) setView('confirm')
    else void performShutdown()
  }, [performShutdown, props.confirmShutdown])

  const handleRestartTrigger = useCallback(() => {
    if (props.confirmRestart()) setView('restart-confirm')
    else void performRestart()
  }, [performRestart, props.confirmRestart])

  // Esc closes the dialog (never while an exit is in flight).
  useEffect(() => {
    if (view === 'closed') return
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => { window.removeEventListener('keydown', onKeyDown) }
  }, [view, close])

  const floatingGroup = floating ? css.floatingGroup : undefined
  const restartFloating = floating ? css.triggerFloatingRestart : undefined
  return (
    <>
      <div className={floatingGroup}>
        <button
          type="button"
          className={floating ? css.triggerFloating : css.trigger}
          aria-label={t('entry.label')}
          title={t('entry.label')}
          onClick={handleTrigger}
        >
          <PowerIcon size={floating ? 20 : (wide ? 16 : 18)} />
        </button>
        <button
          type="button"
          className={floating ? restartFloating : css.trigger}
          aria-label={t('restart.label')}
          title={t('restart.label')}
          onClick={handleRestartTrigger}
        >
          <RestartIcon size={floating ? 20 : (wide ? 16 : 18)} />
        </button>
      </div>
      {view !== 'closed' && createPortal((
        <div className={css.overlay} role="presentation">
          <div className={css.mask} aria-hidden="true" onClick={close} />
          <div className={css.dialog} role="dialog" aria-modal="true" aria-label={t('dialog.title')}>
            {view === 'confirm' && (
              <div className={css.dialogBody}>
                <div className={css.dialogIcon}><PowerIcon size={22} /></div>
                <h2 className={css.dialogTitle}>{t('dialog.title')}</h2>
                <p className={css.dialogText}>{t('dialog.description')}</p>
                <div className={css.dialogActions}>
                  <button type="button" className={css.cancel} onClick={close}>{t('dialog.cancel')}</button>
                  <button type="button" className={css.confirm} autoFocus onClick={() => { void performShutdown() }}>{t('dialog.confirm')}</button>
                </div>
              </div>
            )}
            {view === 'restart-confirm' && (
              <div className={css.dialogBody}>
                <div className={css.dialogIcon}><RestartIcon size={22} /></div>
                <h2 className={css.dialogTitle}>{t('restart.title')}</h2>
                <p className={css.dialogText}>{t('restart.description')}</p>
                <div className={css.dialogActions}>
                  <button type="button" className={css.cancel} onClick={close}>{t('dialog.cancel')}</button>
                  <button type="button" className={css.confirm} autoFocus onClick={() => { void performRestart() }}>{t('restart.confirm')}</button>
                </div>
              </div>
            )}
            {view === 'restarting' && (
              <div className={css.dialogBody}>
                <div className={css.dialogIcon}><RestartIcon size={22} /></div>
                <p className={css.dialogStatus} role="status">{t('restart.restarting')}</p>
              </div>
            )}
            {view === 'shutting-down' && (
              <div className={css.dialogBody}>
                <div className={css.dialogIcon}><PowerIcon size={22} /></div>
                <p className={css.dialogStatus} role="status">{t('dialog.shuttingDown')}</p>
              </div>
            )}
            {view === 'error' && (
              <div className={css.dialogBody}>
                <div className={css.dialogIcon}><PowerIcon size={22} /></div>
                <p className={css.dialogError} role="alert">{t('dialog.failed', { message: error ?? '' })}</p>
                <div className={css.dialogActions}>
                  <button type="button" className={css.cancel} onClick={close}>{t('dialog.close')}</button>
                  <button type="button" className={css.confirm} onClick={() => { void performShutdown() }}>{t('dialog.retry')}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      ), document.body)}
    </>
  )
}