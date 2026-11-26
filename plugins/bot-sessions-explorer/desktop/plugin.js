/**
 * Bots & Sessions Explorer — Plugin Desktop Hermes
 *
 * Interface en trois colonnes pour parcourir tous les bots disponibles
 * (locaux et sur gateways distantes), leurs sessions et le contenu
 * de la session selectionnee.
 */

import {
  Badge,
  Blobatar,
  Button,
  coarseElapsed,
  Codicon,
  ConnectionGlyph,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  ErrorState,
  fmtDateTime,
  host,
  icons,
  Loader,
  MessageTextContent,
  PALETTE_AREA,
  profileColor,
  profileColorSoft,
  ROUTES_AREA,
  SearchField,
  SessionStatusDot,
  SIDEBAR_NAV_AREA,
  StatusDot,
  useQuery,
  useQueryClient,
  useValue,
  writeClipboardText,
} from '@hermes/plugin-sdk'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { jsx, jsxs } from 'react/jsx-runtime'

const PLUGIN_ID = 'bot-sessions-explorer'
const ROUTE_PATH = '/bot-sessions'
const STORAGE_SELECTED_BOT = 'selectedBotKey'
const STORAGE_SPLIT_WIDTH = 'leftColumnWidth'
const STORAGE_MID_WIDTH = 'middleColumnWidth'
const FALLBACK_POLL_MS = 12_000
const DEFAULT_LEFT_WIDTH = 260
const MIN_LEFT_WIDTH = 200
const MAX_LEFT_WIDTH = 420
const DEFAULT_MID_WIDTH = 320
const MIN_MID_WIDTH = 240
const MAX_MID_WIDTH = 520

const CSS = `
.bse-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  min-height: 0;
  background: var(--background);
  color: var(--ui-text-primary);
  font-size: 13px;
}
.bse-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--ui-stroke-secondary);
  flex-shrink: 0;
}
.bse-topbar-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--ui-text-primary);
  min-width: 0;
}
.bse-topbar-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--ui-text-tertiary);
}
.bse-columns {
  display: flex;
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}
.bse-columns[data-narrow="true"] {
  flex-direction: column;
}
.bse-col-left {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  flex-shrink: 0;
  border-right: 1px solid var(--ui-stroke-secondary);
  background: var(--card, var(--background));
}
.bse-columns[data-narrow="true"] .bse-col-left {
  width: 100% !important;
  max-height: 28%;
  border-right: none;
  border-bottom: 1px solid var(--ui-stroke-secondary);
}
.bse-col-mid {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  flex-shrink: 0;
  border-right: 1px solid var(--ui-stroke-secondary);
  background: var(--background);
}
.bse-columns[data-narrow="true"] .bse-col-mid {
  width: 100% !important;
  max-height: 32%;
  border-right: none;
  border-bottom: 1px solid var(--ui-stroke-secondary);
}
.bse-resizer {
  width: 5px;
  cursor: col-resize;
  flex-shrink: 0;
  margin-left: -2px;
  margin-right: -3px;
  z-index: 2;
  background: transparent;
  transition: background 0.15s ease;
}
.bse-resizer:hover,
.bse-resizer[data-dragging="true"] {
  background: var(--ui-accent);
  opacity: 0.55;
}
.bse-col-right {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  min-width: 0;
  background: var(--background);
}
.bse-col-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px 10px;
  border-bottom: 1px solid var(--ui-stroke-secondary);
  flex-shrink: 0;
}
.bse-col-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}
.bse-col-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ui-text-tertiary);
}
.bse-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 8px;
}
.bse-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 8px 8px 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--ui-text-tertiary);
}
.bse-group-label {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bse-bot-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  transition: background 0.12s ease, border-color 0.12s ease;
  margin-bottom: 2px;
}
.bse-bot-row:hover {
  background: var(--chrome-action-hover);
}
.bse-bot-row[data-selected="true"] {
  background: var(--chrome-action-hover);
  border-color: var(--ui-stroke-secondary);
}
.bse-bot-row[data-unreachable="true"] {
  opacity: 0.72;
}
.bse-avatar {
  position: relative;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  border: 1px solid var(--ui-stroke-secondary);
}
.bse-bot-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.bse-bot-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  min-width: 0;
}
.bse-bot-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--ui-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bse-bot-sub {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--ui-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bse-bot-preview {
  font-size: 11.5px;
  color: var(--ui-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 2px;
}
.bse-status-line {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--ui-text-tertiary);
}
.bse-status-line[data-tone="bad"] {
  color: var(--destructive, #ef4444);
}
.bse-status-line[data-tone="warn"] {
  color: #eab308;
}
.bse-status-line[data-tone="good"] {
  color: var(--ui-text-secondary);
}
.bse-unread-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 600;
  background: var(--ui-accent);
  color: #fff;
  flex-shrink: 0;
}
.bse-filters {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.bse-filter-pill {
  font-size: 11px;
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid var(--ui-stroke-secondary);
  background: transparent;
  color: var(--ui-text-secondary);
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
}
.bse-filter-pill:hover {
  background: var(--chrome-action-hover);
  color: var(--ui-text-primary);
}
.bse-filter-pill[data-active="true"] {
  background: var(--ui-accent);
  border-color: var(--ui-accent);
  color: #fff;
}
.bse-session-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  text-align: left;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--ui-stroke-secondary);
  background: var(--card, transparent);
  cursor: pointer;
  margin-bottom: 6px;
  transition: background 0.12s ease, border-color 0.12s ease;
}
.bse-session-row:hover {
  background: var(--chrome-action-hover);
  border-color: var(--ui-stroke-primary, var(--ui-stroke-secondary));
}
.bse-session-del {
  opacity: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 5px;
  border: none;
  background: transparent;
  color: var(--ui-text-tertiary);
  cursor: pointer;
  transition: opacity 0.12s ease, color 0.12s ease, background 0.12s ease;
}
.bse-session-row:hover .bse-session-del,
.bse-session-row:focus-within .bse-session-del {
  opacity: 1;
}
.bse-session-del:hover {
  color: var(--destructive, #ef4444);
  background: color-mix(in srgb, var(--destructive, #ef4444) 12%, transparent);
}
.bse-session-dot-wrap {
  padding-top: 5px;
  flex-shrink: 0;
}
.bse-session-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.bse-session-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}
.bse-session-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ui-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bse-session-badges {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.bse-session-preview {
  font-size: 12px;
  color: var(--ui-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bse-session-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--ui-text-tertiary);
}
.bse-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  margin-bottom: 8px;
  border: 1px solid var(--ui-stroke-secondary);
  background: var(--chrome-action-hover);
  color: var(--ui-text-secondary);
}
.bse-banner[data-tone="bad"] {
  border-color: color-mix(in srgb, var(--destructive, #ef4444) 45%, transparent);
  color: var(--destructive, #ef4444);
}
.bse-banner[data-tone="warn"] {
  border-color: rgba(234, 179, 8, 0.45);
  color: #eab308;
}
.bse-detail-grid {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 6px 12px;
  font-size: 12px;
  margin-top: 8px;
}
.bse-detail-key {
  color: var(--ui-text-tertiary);
}
.bse-detail-val {
  color: var(--ui-text-primary);
  word-break: break-all;
}
.bse-msg-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px 20px;
}
.bse-msg-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--ui-stroke-secondary);
  background: var(--card, transparent);
  min-width: 0;
}
.bse-msg-card[data-role="user"] {
  background: var(--chrome-action-hover);
  border-color: var(--ui-stroke-primary, var(--ui-stroke-secondary));
}
.bse-msg-card[data-role="tool"] {
  padding: 7px 10px;
  font-size: 12px;
  opacity: 0.85;
}
.bse-msg-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--ui-text-tertiary);
}
.bse-msg-body {
  font-size: 13px;
  line-height: 1.5;
  color: var(--ui-text-primary);
  word-break: break-word;
  overflow-wrap: anywhere;
}
.bse-msg-pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: 12.5px;
}
`

let styleInjected = false
function ensureStyles() {
  if (styleInjected || typeof document === 'undefined') return
  styleInjected = true
  const el = document.createElement('style')
  el.setAttribute('data-plugin', PLUGIN_ID)
  el.textContent = CSS
  document.head.appendChild(el)
}

const SESSION_TYPE_LABELS = {
  all: 'All',
  bot_chat: 'Bot Chat',
  regular: 'Regular',
  cron: 'Cron',
  group: 'Group',
  delegated: 'Delegated',
  subagent: 'Subagent',
}

const SESSION_TYPE_TONES = {
  bot_chat: 'default',
  regular: 'secondary',
  cron: 'outline',
  group: 'secondary',
  delegated: 'outline',
  subagent: 'outline',
}

function classifyError(error) {
  const msg = String(error?.message || error || '').trim()
  const lower = msg.toLowerCase()
  if (!msg) return { kind: 'unknown', label: 'Unknown error', tone: 'bad' }
  if (/\b401\b|\b403\b|unauthorized|forbidden|auth|token|permission/.test(lower)) {
    return { kind: 'auth_error', label: 'Authorization error', tone: 'bad', detail: msg }
  }
  if (/unreachable|econnrefused|etimedout|enotfound|ssh|socket|network|offline|timed out|gateway unavailable/.test(lower)) {
    return { kind: 'gateway_unreachable', label: 'Gateway unreachable', tone: 'bad', detail: msg }
  }
  if (/not found|no such session|missing session/.test(lower)) {
    return { kind: 'session_missing', label: 'Session not found', tone: 'warn', detail: msg }
  }
  return { kind: 'unknown', label: msg.slice(0, 80), tone: 'bad', detail: msg }
}

function toMsTimestamp(value) {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) return 0
    return value > 1e12 ? value : value * 1000
  }
  const parsed = Date.parse(String(value))
  return Number.isFinite(parsed) ? parsed : 0
}

function formatActivity(ms) {
  if (!ms) return 'No activity'
  try {
    const sec = Math.floor(ms / 1000)
    const elapsed = coarseElapsed(sec)
    if (typeof elapsed === 'string') return elapsed
    if (elapsed && typeof elapsed === 'object') {
      if (elapsed.unit === 'now') return 'Just now'
      if (elapsed.unit && elapsed.value !== undefined) {
        const u = elapsed.unit === 'day' || elapsed.unit === 'd'
          ? 'd'
          : elapsed.unit === 'hour' || elapsed.unit === 'h'
            ? 'h'
            : elapsed.unit === 'min' || elapsed.unit === 'm'
              ? 'm'
              : elapsed.unit
        return `${elapsed.value}${u}`
      }
    }
  } catch {
    /* fallback */
  }
  try {
    return typeof fmtDateTime?.format === 'function' ? fmtDateTime.format(ms) : fmtDateTime(ms)
  } catch {
    return new Date(ms).toLocaleString()
  }
}

function classifySessionType(raw) {
  if (!raw || typeof raw !== 'object') return 'regular'
  const title = String(raw.title || '').trim()
  const source = String(raw.source || '').trim().toLowerCase()
  const handoff = String(raw.handoff_platform || '').trim().toLowerCase()

  if (raw._isBotChat || title === 'Bot Chat' || source === 'bot_chat') {
    return 'bot_chat'
  }
  if (source === 'cron' || raw.scheduler_owned === true || /^cron[:\-]/i.test(source)) {
    return 'cron'
  }
  if (source === 'group' || source === 'group_chat' || handoff === 'group' || /^group[:\-]/i.test(title.toLowerCase())) {
    return 'group'
  }
  if (raw.is_internal_child === true || source === 'subagent' || source === 'child') {
    return 'subagent'
  }
  if (source === 'delegate' || source === 'delegated' || source === 'delegate_task' || raw.parent_session_id) {
    return 'delegated'
  }
  return 'regular'
}

function normalizeBotKey(connectionId, profile) {
  const conn = String(connectionId || 'local').trim() || 'local'
  const prof = String(profile || 'default').trim() || 'default'
  return `${conn}::${prof}`
}

function sanitizeText(value) {
  if (value === null || value === undefined) return ''
  return String(value).replace(/\s+/g, ' ').trim()
}

function botStatusInfo(bot, gatewayState, busyBySession) {
  if (gatewayState && gatewayState !== 'open' && !bot.remoteSource) {
    return { code: 'desktop_disconnected', label: 'Desktop connection interrupted', tone: 'bad' }
  }
  if (bot.sourceReachable === false) {
    return { code: 'gateway_unreachable', label: 'Gateway unreachable', tone: 'bad' }
  }
  if (bot.unserved) {
    return { code: 'profile_unavailable', label: 'Profile unavailable', tone: 'warn' }
  }
  if (bot.sourceError) {
    const classified = classifyError(bot.sourceError)
    return { code: classified.kind, label: classified.label, tone: classified.tone }
  }
  const canonicalId = bot.canonicalSession?.id || bot.canonicalSession?.resolved_id
  const lastId = bot.lastSession?.id
  const isBusy =
    Boolean(bot.busy) ||
    Boolean(canonicalId && busyBySession?.[canonicalId]) ||
    Boolean(lastId && busyBySession?.[lastId]) ||
    Boolean(bot.workerSessionActive)

  if (isBusy) {
    return { code: 'active', label: 'Active', tone: 'good' }
  }
  if (bot.stopped) {
    return { code: 'stopped', label: 'Bot stopped', tone: 'muted' }
  }
  return { code: 'available', label: 'Connected', tone: 'good' }
}

async function fetchBotsRoster() {
  let routes = []
  try {
    if (typeof host.profileRoutes === 'function') {
      routes = await host.profileRoutes()
    }
  } catch {
    routes = []
  }

  const activeConnectionId =
    (typeof host.activeConnectionId === 'function' ? host.activeConnectionId() : null) ||
    host.state.connectionId?.get?.() ||
    'local'
  const activeProfile = String(host.state.profile?.get?.() || 'default').trim() || 'default'

  const activeRoute = Array.isArray(routes)
    ? routes.find((r) => r?.connectionId === activeConnectionId && r?.profile === activeProfile) ||
      routes.find((r) => r?.profile === activeProfile) ||
      routes[0]
    : null

  let localProfiles = []
  let localError = null
  try {
    const res = activeRoute
      ? await host.requestProfile(activeRoute, 'profiles.list', {})
      : await host.request('profiles.list', {})
    localProfiles = Array.isArray(res?.profiles) ? res.profiles : []
  } catch (err) {
    localError = err
  }

  let union = null
  let agentsError = null
  if (typeof host.agents === 'function') {
    try {
      union = await host.agents()
    } catch (err) {
      agentsError = err
    }
  }

  const sources = Array.isArray(union?.sources) ? union.sources : []
  const sourceById = new Map()
  for (const s of sources) {
    if (s?.connectionId) {
      sourceById.set(s.connectionId, s)
    }
  }

  const routeByKey = new Map()
  for (const r of Array.isArray(routes) ? routes : []) {
    if (r?.connectionId && r?.profile) {
      routeByKey.set(normalizeBotKey(r.connectionId, r.profile), r)
    }
  }

  const localByName = new Map()
  for (const row of localProfiles) {
    if (row?.name) {
      localByName.set(row.name, row)
    }
  }

  const botsMap = new Map()
  const unionAgents = Array.isArray(union?.agents) ? union.agents : []

  if (unionAgents.length > 0) {
    for (const agent of unionAgents) {
      const profile = String(agent?.profile || '').trim() || 'default'
      const connectionId = String(agent?.connectionId || activeConnectionId || 'local').trim()
      const key = normalizeBotKey(connectionId, profile)
      const src = sourceById.get(connectionId)
      const isSameAsActive = connectionId === activeConnectionId
      const rich = isSameAsActive ? localByName.get(profile) : null
      const meta = rich?.ui_meta?.['hermes-bots'] || agent?.profileMetadata?.ui_meta?.['hermes-bots'] || {}

      const title =
        sanitizeText(meta.title) ||
        sanitizeText(rich?.title) ||
        sanitizeText(rich?.display_name) ||
        sanitizeText(agent?.profileMetadata?.title) ||
        sanitizeText(agent?.profileMetadata?.display_name) ||
        profile

      const description =
        sanitizeText(meta.description) ||
        sanitizeText(rich?.description) ||
        sanitizeText(agent?.profileMetadata?.description) ||
        ''

      const lastSession = rich?.last_session || null
      const canonicalSession = rich?.canonical_session || null
      const lastMsg =
        sanitizeText(lastSession?.preview) ||
        sanitizeText(canonicalSession?.preview) ||
        ''
      const lastAct = Math.max(
        toMsTimestamp(lastSession?.last_active),
        toMsTimestamp(canonicalSession?.last_active),
        toMsTimestamp(rich?.worker_session?.last_active),
      )

      const route =
        routeByKey.get(key) ||
        (connectionId
          ? {
              connectionId,
              mode: src?.kind === 'local' ? 'local' : 'remote',
              profile,
              targetProfile: agent?.targetProfile || profile,
            }
          : null)

      botsMap.set(key, {
        id: key,
        key,
        name: profile,
        title,
        description,
        avatar: meta.image || null,
        avatarColor: meta.color || null,
        profile,
        targetProfile: agent?.targetProfile || profile,
        gateway: connectionId,
        machine: sanitizeText(agent?.connectionLabel || src?.label || (connectionId === 'local' ? 'Local' : connectionId)),
        connectionId,
        connectionKind: agent?.connectionKind || src?.kind || 'local',
        remoteSource: (agent?.connectionKind || src?.kind || 'local') !== 'local',
        sourceReachable: src ? src.reachable !== false : true,
        sourceError: src?.error || null,
        unserved: agent?.reachable === false,
        route,
        canonicalSession,
        lastSession,
        workerSessionActive: Boolean(rich?.worker_session?.last_active && Date.now() - toMsTimestamp(rich.worker_session.last_active) < 60_000),
        lastMessage: lastMsg,
        lastActivity: lastAct,
        unread: 0,
        busy: false,
      })
    }
  }

  for (const rich of localProfiles) {
    const profile = String(rich?.name || '').trim() || 'default'
    const connectionId = String(activeConnectionId || 'local').trim()
    const key = normalizeBotKey(connectionId, profile)
    if (botsMap.has(key)) continue

    const meta = rich?.ui_meta?.['hermes-bots'] || {}
    const title =
      sanitizeText(meta.title) ||
      sanitizeText(rich?.title) ||
      sanitizeText(rich?.display_name) ||
      profile
    const description = sanitizeText(meta.description) || sanitizeText(rich?.description) || ''
    const lastSession = rich?.last_session || null
    const canonicalSession = rich?.canonical_session || null
    const lastMsg = sanitizeText(lastSession?.preview) || sanitizeText(canonicalSession?.preview) || ''
    const lastAct = Math.max(
      toMsTimestamp(lastSession?.last_active),
      toMsTimestamp(canonicalSession?.last_active),
      toMsTimestamp(rich?.worker_session?.last_active),
    )

    botsMap.set(key, {
      id: key,
      key,
      name: profile,
      title,
      description,
      avatar: meta.image || null,
      avatarColor: meta.color || null,
      profile,
      targetProfile: profile,
      gateway: connectionId,
      machine: connectionId === 'local' ? 'Local' : connectionId,
      connectionId,
      connectionKind: connectionId === 'local' ? 'local' : 'remote',
      remoteSource: connectionId !== 'local',
      sourceReachable: true,
      sourceError: null,
      unserved: false,
      route: routeByKey.get(key) || null,
      canonicalSession,
      lastSession,
      workerSessionActive: Boolean(rich?.worker_session?.last_active && Date.now() - toMsTimestamp(rich.worker_session.last_active) < 60_000),
      lastMessage: lastMsg,
      lastActivity: lastAct,
      unread: 0,
      busy: false,
    })
  }

  const bots = Array.from(botsMap.values())
  bots.sort((a, b) => {
    if (a.remoteSource !== b.remoteSource) return a.remoteSource ? 1 : -1
    if (b.lastActivity !== a.lastActivity) return b.lastActivity - a.lastActivity
    return a.title.localeCompare(b.title)
  })

  return {
    bots,
    sources,
    error: bots.length === 0 ? (localError || agentsError) : null,
  }
}

async function fetchBotSessions(bot, busyBySession) {
  if (!bot) return { sessions: [], error: null }

  if (bot.sourceReachable === false) {
    return {
      sessions: [],
      error: { kind: 'gateway_unreachable', label: 'Remote gateway unreachable', detail: bot.sourceError || '' },
    }
  }
  if (bot.unserved) {
    return {
      sessions: [],
      error: { kind: 'profile_unavailable', label: 'Profile unavailable on this gateway', detail: '' },
    }
  }

  let rawSessions = []
  let fetchError = null

  if (typeof host.listPersistedSessions === 'function') {
    try {
      const res = await host.listPersistedSessions(bot.route || null, {
        profile: bot.targetProfile || bot.profile,
        limit: 200,
      })
      if (Array.isArray(res?.sessions)) {
        rawSessions = res.sessions
      }
    } catch (err) {
      fetchError = err
    }
  }

  if (rawSessions.length === 0) {
    try {
      const params = { profile: bot.targetProfile || bot.profile, limit: 120, include_hidden: true }
      const res = bot.route
        ? await host.requestProfile(bot.route, 'session.list', params)
        : await host.request('session.list', params)
      if (Array.isArray(res?.sessions)) {
        rawSessions = res.sessions
        fetchError = null
      }
    } catch (err) {
      if (!fetchError) fetchError = err
    }
  }

  let activeMap = new Map()
  try {
    const activeParams = { profile: bot.targetProfile || bot.profile }
    const activeRes = bot.route
      ? await host.requestProfile(bot.route, 'session.active_list', activeParams)
      : await host.request('session.active_list', activeParams)
    if (Array.isArray(activeRes?.sessions)) {
      for (const item of activeRes.sessions) {
        if (item?.id) activeMap.set(item.id, item)
        if (item?.session_key) activeMap.set(item.session_key, item)
      }
    }
  } catch {
    /* active_list est optionnel selon la version du backend */
  }

  const byId = new Map()
  const addRow = (row, extra = {}) => {
    const id = String(row?.id || row?.resolved_id || '').trim()
    if (!id) return
    const existing = byId.get(id)
    const activeItem = activeMap.get(id)
    const isBusy =
      Boolean(busyBySession?.[id]) ||
      Boolean(row?.scheduler_owned) ||
      Boolean(row?.is_active && activeItem && activeItem.status && activeItem.status !== 'idle') ||
      Boolean(activeItem && ['working', 'streaming', 'starting', 'waiting', 'resuming'].includes(activeItem.status))

    const merged = {
      id,
      storedId: id,
      title: sanitizeText(row?.title || existing?.title) || 'Untitled session',
      profile: bot.profile,
      gateway: bot.gateway,
      sessionType: extra.sessionType || classifySessionType({ ...row, ...extra }),
      lastMessage: sanitizeText(row?.preview || activeItem?.preview || existing?.lastMessage || ''),
      updatedAt: Math.max(
        toMsTimestamp(row?.last_active),
        toMsTimestamp(row?.started_at),
        toMsTimestamp(activeItem?.last_active),
        existing?.updatedAt || 0,
      ),
      status: activeItem?.status || (row?.is_active ? 'active' : 'idle'),
      unread: Boolean(row?.unread || existing?.unread),
      busy: isBusy,
      messageCount: row?.message_count ?? row?.live_message_count ?? existing?.messageCount ?? 0,
      model: row?.model || activeItem?.model || existing?.model || null,
      source: row?.source || existing?.source || null,
      hidden: Boolean(row?.hidden || existing?.hidden),
    }
    byId.set(id, merged)
  }

  for (const row of rawSessions) {
    addRow(row)
  }

  if (bot.canonicalSession?.id || bot.canonicalSession?.resolved_id) {
    addRow(
      {
        ...bot.canonicalSession,
        id: bot.canonicalSession.id || bot.canonicalSession.resolved_id,
        title: bot.canonicalSession.title || 'Bot Chat',
        hidden: true,
      },
      { _isBotChat: true, sessionType: 'bot_chat' },
    )
  }

  if (bot.lastSession?.id && !byId.has(bot.lastSession.id)) {
    addRow(bot.lastSession)
  }

  const sessions = Array.from(byId.values())
  sessions.sort((a, b) => {
    if (a.busy !== b.busy) return a.busy ? -1 : 1
    if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt
    if (a.sessionType === 'bot_chat' && b.sessionType !== 'bot_chat') return -1
    if (b.sessionType === 'bot_chat' && a.sessionType !== 'bot_chat') return 1
    return a.title.localeCompare(b.title)
  })

  return {
    sessions,
    error: sessions.length === 0 && fetchError ? classifyError(fetchError) : null,
  }
}

async function openSessionInHermes(bot, session) {
  const storedId = String(session?.storedId || session?.id || '').trim()
  if (!storedId) return

  if (typeof host.openSession === 'function') {
    const ownerKey = `${bot.connectionId || 'local'}::${bot.profile}`
    try {
      await host.openSession(storedId, {
        ...(bot.route ? { route: bot.route } : {}),
        profile: bot.profile,
        intent: 'tab',
        awaitHydration: true,
        expectHistory: (session.messageCount ?? 1) > 0,
        forceResume: true,
        keepAllProfilesScope: true,
        workspaceMode: 'bots',
        workspaceOwnerKey: ownerKey,
        retryHydrationTimeoutOnce: true,
      })
      return
    } catch (err) {
      host.notifyError?.(err, 'Could not open session')
      return
    }
  }

  if (typeof host.navigate === 'function') {
    host.navigate(`/${storedId}`)
  }
}

function extractMessageText(msg) {
  if (!msg || typeof msg !== 'object') return ''
  const raw = msg.display_content ?? msg.content ?? msg.text ?? ''
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw)) {
    return raw
      .map((part) => {
        if (typeof part === 'string') return part
        if (part && typeof part === 'object') {
          if (typeof part.text === 'string') return part.text
          if (typeof part.content === 'string') return part.content
        }
        return ''
      })
      .filter(Boolean)
      .join('\n')
  }
  if (raw && typeof raw === 'object') {
    if (typeof raw.text === 'string') return raw.text
    try {
      return JSON.stringify(raw, null, 2)
    } catch {
      return String(raw)
    }
  }
  return String(raw || '')
}

async function fetchSessionMessages(bot, session) {
  const storedId = String(session?.storedId || session?.id || '').trim()
  if (!bot || !storedId) return { messages: [], inflight: null, error: null }

  if (bot.sourceReachable === false) {
    return {
      messages: [],
      inflight: null,
      error: { kind: 'gateway_unreachable', label: 'Remote gateway unreachable' },
    }
  }

  try {
    const params = {
      session_id: storedId,
      profile: bot.targetProfile || bot.profile,
      lazy: true,
    }
    const res = bot.route
      ? await host.requestProfile(bot.route, 'session.resume', params)
      : await host.request('session.resume', params)

    const rawMessages = Array.isArray(res?.messages) ? res.messages : []
    const messages = rawMessages
      .filter((m) => m && m.display_kind !== 'hidden')
      .map((m, idx) => ({
        id: m.row_id ?? m.id ?? `msg-${idx}`,
        role: m.role || 'assistant',
        toolName: m.tool_name || m.name || null,
        text: extractMessageText(m),
        timestamp: toMsTimestamp(m.timestamp),
        displayKind: m.display_kind || null,
      }))
      .filter((m) => m.text.trim().length > 0 || m.role === 'tool')

    return {
      messages,
      inflight: res?.inflight || null,
      error: null,
    }
  } catch (err) {
    return {
      messages: [],
      inflight: null,
      error: classifyError(err),
    }
  }
}

async function deleteSessionRpc(bot, storedId) {
  const params = {
    session_id: storedId,
    profile: bot.targetProfile || bot.profile,
  }
  return bot.route
    ? host.requestProfile(bot.route, 'session.delete', params)
    : host.request('session.delete', params)
}

function BotAvatar({ bot }) {
  const bg = bot.avatarColor ? profileColorSoft(bot.avatarColor) : profileColorSoft(bot.name)
  const fg = bot.avatarColor || profileColor(bot.name)

  return jsx('div', {
    className: 'bse-avatar',
    style: { background: bg, color: fg },
    children: bot.avatar
      ? jsx('img', {
          src: bot.avatar,
          alt: bot.title,
          style: { width: '100%', height: '100%', objectFit: 'cover' },
        })
      : typeof Blobatar === 'function'
        ? jsx(Blobatar, { name: bot.name, size: 30 })
        : jsx('span', {
            style: { fontWeight: 700, fontSize: 13 },
            children: (bot.title || bot.name || '?').slice(0, 2).toUpperCase(),
          }),
  })
}

function BotSessionsExplorerPage({ ctx }) {
  ensureStyles()

  const queryClient = useQueryClient()
  const viewport = useValue(host.state.viewport)
  const gatewayState = useValue(host.state.gateway)
  const busyBySession = useValue(host.state.busyBySession) || {}
  const focusedStoredSessionId = useValue(host.state.focusedStoredSessionId)

  const isNarrow = Boolean(viewport?.narrow || (viewport?.width && viewport.width < 520))

  const [selectedBotKey, setSelectedBotKey] = useState(() => ctx.storage.get(STORAGE_SELECTED_BOT, null))
  const [botSearch, setBotSearch] = useState('')
  const [sessionSearch, setSessionSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [hideCron, setHideCron] = useState(() => Boolean(ctx.storage.get('hideCron', true)))
  const [leftWidth, setLeftWidth] = useState(() => {
    const saved = Number(ctx.storage.get(STORAGE_SPLIT_WIDTH, DEFAULT_LEFT_WIDTH))
    return Number.isFinite(saved) && saved >= MIN_LEFT_WIDTH && saved <= MAX_LEFT_WIDTH
      ? saved
      : DEFAULT_LEFT_WIDTH
  })
  const [draggingSplit, setDraggingSplit] = useState(null)
  const [detailSession, setDetailSession] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const columnsRef = useRef(null)

  const rosterQuery = useQuery({
    queryKey: [PLUGIN_ID, 'roster'],
    queryFn: fetchBotsRoster,
    refetchInterval: FALLBACK_POLL_MS,
    staleTime: 4_000,
  })

  const bots = rosterQuery.data?.bots || []

  const selectedBot = useMemo(() => {
    if (!bots.length) return null
    return bots.find((b) => b.key === selectedBotKey) || bots[0]
  }, [bots, selectedBotKey])

  useEffect(() => {
    if (selectedBot && selectedBot.key !== selectedBotKey) {
      setSelectedBotKey(selectedBot.key)
      ctx.storage.set(STORAGE_SELECTED_BOT, selectedBot.key)
    }
  }, [selectedBot, selectedBotKey, ctx.storage])

  const sessionsQuery = useQuery({
    queryKey: [PLUGIN_ID, 'sessions', selectedBot?.key || 'none'],
    queryFn: () => fetchBotSessions(selectedBot, busyBySession),
    enabled: Boolean(selectedBot),
    refetchInterval: FALLBACK_POLL_MS,
    staleTime: 4_000,
  })

  const rawSessions = sessionsQuery.data?.sessions || []

  const emptySessions = useMemo(
    () => rawSessions.filter((s) => s.sessionType !== 'bot_chat' && (s.messageCount ?? 0) === 0),
    [rawSessions],
  )

  // Ecoute temps reel des evenements Hermes avec invalidation ciblee
  useEffect(() => {
    let timer = null
    let pendingRoster = false
    let pendingSessions = false

    const flush = () => {
      timer = null
      if (pendingRoster) {
        pendingRoster = false
        queryClient.invalidateQueries({ queryKey: [PLUGIN_ID, 'roster'] })
      }
      if (pendingSessions) {
        pendingSessions = false
        queryClient.invalidateQueries({ queryKey: [PLUGIN_ID, 'sessions'] })
      }
    }

    const schedule = (roster, sessions) => {
      if (roster) pendingRoster = true
      if (sessions) pendingSessions = true
      if (!timer) {
        timer = window.setTimeout(flush, 250)
      }
    }

    const dispose = ctx.onEvent('*', (ev) => {
      const type = String(ev?.type || ev?.event || '').toLowerCase()
      if (!type) return
      if (type.startsWith('gateway.') || type.startsWith('profile.') || type.startsWith('connection.')) {
        schedule(true, true)
      } else if (
        type.startsWith('session.') ||
        type === 'message.complete' ||
        type === 'message.created' ||
        type === 'turn.complete'
      ) {
        schedule(true, true)
      }
    })

    return () => {
      dispose()
      if (timer) window.clearTimeout(timer)
    }
  }, [ctx, queryClient])

  // Redimensionnement de la colonne gauche
  useEffect(() => {
    if (!draggingSplit) return
    const onMove = (e) => {
      const rect = columnsRef.current?.getBoundingClientRect()
      if (!rect) return
      const next = Math.min(MAX_LEFT_WIDTH, Math.max(MIN_LEFT_WIDTH, Math.round(e.clientX - rect.left)))
      setLeftWidth(next)
    }
    const onUp = () => {
      setDraggingSplit(null)
      ctx.storage.set(STORAGE_SPLIT_WIDTH, leftWidth)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [draggingSplit, leftWidth, ctx.storage])

  const filteredBots = useMemo(() => {
    const q = botSearch.trim().toLowerCase()
    if (!q) return bots
    return bots.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.name.toLowerCase().includes(q) ||
        b.machine.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.lastMessage.toLowerCase().includes(q),
    )
  }, [bots, botSearch])

  const botGroups = useMemo(() => {
    const groups = new Map()
    for (const bot of filteredBots) {
      const gKey = bot.connectionId || 'local'
      if (!groups.has(gKey)) {
        groups.set(gKey, {
          connectionId: gKey,
          label: bot.machine || (gKey === 'local' ? 'Local' : gKey),
          kind: bot.connectionKind || 'local',
          reachable: bot.sourceReachable !== false,
          bots: [],
        })
      }
      groups.get(gKey).bots.push(bot)
    }
    return Array.from(groups.values())
  }, [filteredBots])

  const filteredSessions = useMemo(() => {
    const q = sessionSearch.trim().toLowerCase()
    return rawSessions.filter((s) => {
      if (hideCron && s.sessionType === 'cron') return false
      if (typeFilter !== 'all' && s.sessionType !== typeFilter) return false
      if (!q) return true
      return (
        s.title.toLowerCase().includes(q) ||
        s.lastMessage.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.sessionType.toLowerCase().includes(q)
      )
    })
  }, [rawSessions, sessionSearch, typeFilter, hideCron])

  const selectBot = (bot) => {
    setSelectedBotKey(bot.key)
    ctx.storage.set(STORAGE_SELECTED_BOT, bot.key)
  }

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: [PLUGIN_ID] })
  }

  const selectedStatus = selectedBot ? botStatusInfo(selectedBot, gatewayState, busyBySession) : null
  const RefreshIcon = icons?.RefreshCw

  return jsxs('div', {
    className: 'bse-root',
    children: [
      jsxs('div', {
        className: 'bse-topbar',
        children: [
          jsxs('div', {
            className: 'bse-topbar-title',
            children: [
              jsx(Codicon, { name: 'organization', size: '1rem' }),
              jsx('span', { children: 'Bots & Sessions' }),
              jsx(Badge, { variant: 'secondary', children: `${bots.length} bot${bots.length > 1 ? 's' : ''}` }),
            ],
          }),
          jsxs('div', {
            className: 'bse-topbar-meta',
            children: [
              jsx('button', {
                type: 'button',
                className: 'bse-filter-pill',
                'data-active': hideCron ? 'true' : 'false',
                onClick: () => {
                  const next = !hideCron
                  setHideCron(next)
                  ctx.storage.set('hideCron', next)
                },
                title: hideCron ? 'Show cron sessions' : 'Hide cron sessions',
                children: hideCron ? 'Cron hidden' : 'Hide cron',
              }),
              gatewayState && gatewayState !== 'open'
                ? jsxs('span', {
                    className: 'bse-status-line',
                    'data-tone': 'bad',
                    children: [
                      jsx(StatusDot, { tone: 'bad' }),
                      jsx('span', { children: 'Desktop connection interrupted' }),
                    ],
                  })
                : jsxs('span', {
                    className: 'bse-status-line',
                    'data-tone': 'good',
                    children: [jsx(StatusDot, { tone: 'good' }), jsx('span', { children: 'Live updates' })],
                  }),
              jsx(Button, {
                variant: 'ghost',
                size: 'sm',
                onClick: refreshAll,
                title: 'Refresh bots and sessions',
                children: RefreshIcon
                  ? jsx(RefreshIcon, { size: 14 })
                  : jsx(Codicon, { name: 'refresh', size: '0.85rem' }),
              }),
            ],
          }),
        ],
      }),

      jsxs('div', {
        ref: columnsRef,
        className: 'bse-columns',
        'data-narrow': isNarrow ? 'true' : 'false',
        children: [
          // Colonne gauche : Bots disponibles
          jsxs('div', {
            className: 'bse-col-left',
            style: isNarrow ? undefined : { width: `${leftWidth}px` },
            children: [
              jsxs('div', {
                className: 'bse-col-header',
                children: [
                  jsxs('div', {
                    className: 'bse-col-header-row',
                    children: [
                      jsx('span', { className: 'bse-col-title', children: 'Available bots' }),
                      jsx('span', {
                        style: { fontSize: 11, color: 'var(--ui-text-tertiary)' },
                        children: `${filteredBots.length}`,
                      }),
                    ],
                  }),
                  jsx(SearchField, {
                    value: botSearch,
                    onChange: (e) => setBotSearch(typeof e === 'string' ? e : e?.target?.value || ''),
                    placeholder: 'Search a bot or machine…',
                  }),
                ],
              }),
              jsxs('div', {
                className: 'bse-scroll',
                children: [
                  rosterQuery.isLoading
                    ? jsx('div', {
                        style: { padding: 20, display: 'flex', justifyContent: 'center' },
                        children: jsx(Loader, { size: 20 }),
                      })
                    : rosterQuery.data?.error && bots.length === 0
                      ? jsx(ErrorState, {
                          title: 'Could not load bots',
                          description: classifyError(rosterQuery.data.error).label,
                          children: jsx(Button, { size: 'sm', onClick: refreshAll, children: 'Retry' }),
                        })
                      : botGroups.length === 0
                        ? jsx(EmptyState, {
                            title: bots.length === 0 ? 'No bots available' : 'No matching bots',
                            description:
                              bots.length === 0
                                ? 'Create a profile or connect a remote gateway.'
                                : 'Try a different search term.',
                          })
                        : botGroups.map((group) =>
                            jsxs(
                              Fragment,
                              {
                                children: [
                                  jsxs('div', {
                                    className: 'bse-group-header',
                                    children: [
                                      jsxs('span', {
                                        className: 'bse-group-label',
                                        children: [
                                          typeof ConnectionGlyph === 'function'
                                            ? jsx(ConnectionGlyph, { connection: { kind: group.kind || 'local' } })
                                            : null,
                                          jsx('span', { children: group.label }),
                                        ],
                                      }),
                                      jsx(StatusDot, { tone: group.reachable ? 'good' : 'bad' }),
                                    ],
                                  }),
                                  group.bots.map((bot) => {
                                    const st = botStatusInfo(bot, gatewayState, busyBySession)
                                    const isSelected = selectedBot?.key === bot.key
                                    return jsxs(
                                      ContextMenu,
                                      {
                                        children: [
                                          jsx(ContextMenuTrigger, {
                                            asChild: true,
                                            children: jsxs('button', {
                                              type: 'button',
                                              className: 'bse-bot-row',
                                              'data-selected': isSelected ? 'true' : 'false',
                                              'data-unreachable': bot.sourceReachable === false ? 'true' : 'false',
                                              onClick: () => selectBot(bot),
                                              onDoubleClick: () => {
                                                selectBot(bot)
                                                const target = bot.canonicalSession?.id
                                                  ? {
                                                      id: bot.canonicalSession.id,
                                                      storedId: bot.canonicalSession.id,
                                                      messageCount: 1,
                                                    }
                                                  : bot.lastSession?.id
                                                    ? {
                                                        id: bot.lastSession.id,
                                                        storedId: bot.lastSession.id,
                                                        messageCount: bot.lastSession.message_count ?? 1,
                                                      }
                                                    : null
                                                if (target) {
                                                  openSessionInHermes(bot, target)
                                                }
                                              },
                                              children: [
                                                jsx(BotAvatar, { bot }),
                                                jsxs('div', {
                                                  className: 'bse-bot-main',
                                                  children: [
                                                    jsxs('div', {
                                                      className: 'bse-bot-title-row',
                                                      children: [
                                                        jsx('span', {
                                                          className: 'bse-bot-name',
                                                          title: bot.title,
                                                          children: bot.title,
                                                        }),
                                                        jsxs('div', {
                                                          style: { display: 'flex', alignItems: 'center', gap: 6 },
                                                          children: [
                                                            bot.unread > 0
                                                              ? jsx('span', {
                                                                  className: 'bse-unread-badge',
                                                                  children: bot.unread,
                                                                })
                                                              : null,
                                                            jsx(StatusDot, { tone: st.tone }),
                                                          ],
                                                        }),
                                                      ],
                                                    }),
                                                    jsxs('div', {
                                                      className: 'bse-bot-sub',
                                                      children: [
                                                        jsx('span', { children: `${bot.name} · ${bot.machine}` }),
                                                        st.code !== 'available'
                                                          ? jsx('span', {
                                                              style: {
                                                                color:
                                                                  st.tone === 'bad'
                                                                    ? 'var(--destructive, #ef4444)'
                                                                    : st.tone === 'warn'
                                                                      ? '#eab308'
                                                                      : 'var(--ui-accent)',
                                                              },
                                                              children: `· ${st.label}`,
                                                            })
                                                          : null,
                                                      ],
                                                    }),
                                                    bot.description || bot.lastMessage
                                                      ? jsx('div', {
                                                          className: 'bse-bot-preview',
                                                          title: bot.lastMessage || bot.description,
                                                          children: bot.lastMessage || bot.description,
                                                        })
                                                      : null,
                                                  ],
                                                }),
                                              ],
                                            }),
                                          }),
                                          jsxs(ContextMenuContent, {
                                            children: [
                                              jsx(ContextMenuItem, {
                                                disabled: !bot.canonicalSession?.id,
                                                onSelect: () => {
                                                  if (bot.canonicalSession?.id) {
                                                    openSessionInHermes(bot, {
                                                      id: bot.canonicalSession.id,
                                                      storedId: bot.canonicalSession.id,
                                                      messageCount: 1,
                                                    })
                                                  }
                                                },
                                                children: 'Open Bot Chat',
                                              }),
                                              jsx(ContextMenuItem, {
                                                disabled: !bot.lastSession?.id,
                                                onSelect: () => {
                                                  if (bot.lastSession?.id) {
                                                    openSessionInHermes(bot, {
                                                      id: bot.lastSession.id,
                                                      storedId: bot.lastSession.id,
                                                      messageCount: bot.lastSession.message_count ?? 1,
                                                    })
                                                  }
                                                },
                                                children: 'Open recent session',
                                              }),
                                              jsx(ContextMenuSeparator, {}),
                                              jsx(ContextMenuItem, {
                                                onSelect: refreshAll,
                                                children: 'Refresh',
                                              }),
                                            ],
                                          }),
                                        ],
                                      },
                                      bot.key,
                                    )
                                  }),
                                ],
                              },
                              group.connectionId,
                            ),
                          ),
                ],
              }),
            ],
          }),

          !isNarrow
            ? jsx('div', {
                className: 'bse-resizer',
                'data-dragging': draggingSplit === 'left' ? 'true' : 'false',
                onMouseDown: (e) => {
                  e.preventDefault()
                  setDraggingSplit('left')
                },
                title: 'Resize Bots column',
              })
            : null,

          // Colonne droite : Sessions du bot selectionne
          jsxs('div', {
            className: 'bse-col-right',
            children: [
              selectedBot
                ? jsxs('div', {
                    className: 'bse-col-header',
                    style: { padding: '8px 12px' },
                    children: [
                      jsxs('div', {
                        className: 'bse-col-header-row',
                        children: [
                          jsx('span', {
                            className: 'bse-col-title',
                            children: `Sessions (${filteredSessions.length})`,
                          }),
                          jsxs(Button, {
                            size: 'sm',
                            variant: 'outline',
                            disabled: selectedBot.sourceReachable === false || selectedBot.unserved,
                            onClick: () => {
                              const ownerKey = `${selectedBot.connectionId || 'local'}::${selectedBot.profile}`
                              host.setWorkspaceOwnerLabel?.(ownerKey, selectedBot.title)
                              if (typeof host.newChat === 'function') {
                                if (selectedBot.route) {
                                  host.newChat(selectedBot.route, {
                                    workspaceMode: 'bots',
                                    workspaceOwnerKey: ownerKey,
                                  })
                                } else {
                                  host.newChat(selectedBot.profile)
                                }
                              }
                            },
                            title: `Create a new session for ${selectedBot.title}`,
                            children: [
                              jsx(Codicon, { name: 'add', size: '0.8rem' }),
                              jsx('span', { children: 'New session' }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  })
                : null,
              jsxs('div', {
                className: 'bse-scroll',
                children: [
                  selectedBot && selectedBot.sourceReachable === false
                    ? jsxs('div', {
                        className: 'bse-banner',
                        'data-tone': 'bad',
                        children: [
                          jsx(Codicon, { name: 'warning', size: '0.9rem' }),
                          jsx('span', {
                            children: `Gateway unreachable (${selectedBot.machine})${selectedBot.sourceError ? ` — ${selectedBot.sourceError}` : ''}`,
                          }),
                        ],
                      })
                    : null,
                  selectedBot && selectedBot.unserved
                    ? jsxs('div', {
                        className: 'bse-banner',
                        'data-tone': 'warn',
                        children: [
                          jsx(Codicon, { name: 'info', size: '0.9rem' }),
                          jsx('span', { children: 'Gateway reachable, but this profile is unavailable on this instance.' }),
                        ],
                      })
                    : null,
                  !selectedBot
                    ? jsx(EmptyState, {
                        title: 'Select a bot',
                        description: 'Choose a bot in the left column to view its sessions.',
                      })
                    : sessionsQuery.isLoading
                      ? jsx('div', {
                          style: { padding: 24, display: 'flex', justifyContent: 'center' },
                          children: jsx(Loader, { size: 20 }),
                        })
                      : sessionsQuery.data?.error && rawSessions.length === 0
                        ? jsx(ErrorState, {
                            title: 'Could not load sessions',
                            description: sessionsQuery.data.error.label,
                            children: jsx(Button, {
                              size: 'sm',
                              onClick: () =>
                                queryClient.invalidateQueries({ queryKey: [PLUGIN_ID, 'sessions', selectedBot.key] }),
                              children: 'Retry',
                            }),
                          })
                        : filteredSessions.length === 0
                          ? jsx(EmptyState, {
                              title: rawSessions.length === 0 ? 'No sessions' : 'No matching sessions',
                              description:
                                rawSessions.length === 0
                                  ? 'This bot has no saved conversations yet.'
                                  : 'Adjust your search or type filter.',
                            })
                          : filteredSessions.map((session) => {
                              const isFocused = focusedStoredSessionId === session.storedId
                              const typeLabel = SESSION_TYPE_LABELS[session.sessionType] || session.sessionType
                              const typeTone = SESSION_TYPE_TONES[session.sessionType] || 'secondary'
                              return jsxs(
                                ContextMenu,
                                {
                                  children: [
                                    jsx(ContextMenuTrigger, {
                                      asChild: true,
                                      children: jsxs('div', {
                                        role: 'button',
                                        tabIndex: 0,
                                        className: 'bse-session-row',
                                        style: isFocused
                                          ? { borderColor: 'var(--ui-accent)' }
                                          : undefined,
                                        onClick: () => openSessionInHermes(selectedBot, session),
                                        onKeyDown: (e) => {
                                          if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault()
                                            openSessionInHermes(selectedBot, session)
                                          }
                                        },
                                        children: [
                                          jsx('div', {
                                            className: 'bse-session-dot-wrap',
                                            children:
                                              typeof SessionStatusDot === 'function'
                                                ? jsx(SessionStatusDot, { sessionId: session.storedId })
                                                : jsx(StatusDot, { tone: session.busy ? 'good' : 'muted' }),
                                          }),
                                          jsxs('div', {
                                            className: 'bse-session-main',
                                            children: [
                                              jsxs('div', {
                                                className: 'bse-session-top',
                                                children: [
                                                  jsx('span', {
                                                    className: 'bse-session-title',
                                                    title: session.title,
                                                    children: session.title,
                                                  }),
                                                  jsxs('div', {
                                                    className: 'bse-session-badges',
                                                    children: [
                                                      session.busy
                                                        ? jsx(Badge, { variant: 'default', children: 'Running' })
                                                        : null,
                                                      session.unread
                                                        ? jsx('span', { className: 'bse-unread-badge', children: '1' })
                                                        : null,
                                                      jsx(Badge, { variant: typeTone, children: typeLabel }),
                                                      session.sessionType !== 'bot_chat'
                                                        ? jsx('button', {
                                                            type: 'button',
                                                            className: 'bse-session-del',
                                                            title: 'Delete this session',
                                                            onClick: (e) => {
                                                              e.stopPropagation()
                                                              setDeleteTarget({ mode: 'single', session })
                                                            },
                                                            children: jsx(Codicon, { name: 'trash', size: '0.8rem' }),
                                                          })
                                                        : null,
                                                    ],
                                                  }),
                                                ],
                                              }),
                                              session.lastMessage
                                                ? jsx('div', {
                                                    className: 'bse-session-preview',
                                                    title: session.lastMessage,
                                                    children: session.lastMessage,
                                                  })
                                                : null,
                                              jsxs('div', {
                                                className: 'bse-session-meta',
                                                children: [
                                                  jsx('span', { children: formatActivity(session.updatedAt) }),
                                                  session.messageCount > 0
                                                    ? jsx('span', {
                                                        children: `· ${session.messageCount} msg`,
                                                      })
                                                    : null,
                                                  session.model
                                                    ? jsx('span', { children: `· ${session.model}` })
                                                    : null,
                                                ],
                                              }),
                                            ],
                                          }),
                                        ],
                                      }),
                                    }),
                                    jsxs(ContextMenuContent, {
                                      children: [
                                        jsx(ContextMenuItem, {
                                          onSelect: () => openSessionInHermes(selectedBot, session),
                                          children: 'Open in Hermes',
                                        }),
                                        jsx(ContextMenuItem, {
                                          onSelect: () => {
                                            writeClipboardText?.(session.storedId)
                                            host.notify?.({ kind: 'info', message: 'Session ID copied' })
                                          },
                                          children: 'Copy session ID',
                                        }),
                                        jsx(ContextMenuSeparator, {}),
                                        jsx(ContextMenuItem, {
                                          onSelect: () => setDetailSession(session),
                                          children: 'Show details',
                                        }),
                                        session.sessionType !== 'bot_chat'
                                          ? jsxs(Fragment, {
                                              children: [
                                                jsx(ContextMenuSeparator, {}),
                                                jsx(ContextMenuItem, {
                                                  onSelect: () => setDeleteTarget({ mode: 'single', session }),
                                                  children: 'Delete session',
                                                }),
                                              ],
                                            })
                                          : null,
                                      ],
                                    }),
                                  ],
                                },
                                session.id,
                              )
                            }),
                ],
              }),
            ],
          }),
        ],
      }),

      jsx(Dialog, {
        open: Boolean(detailSession),
        onOpenChange: (open) => {
          if (!open) setDetailSession(null)
        },
        children: detailSession
          ? jsxs(DialogContent, {
              children: [
                jsxs(DialogHeader, {
                  children: [
                    jsx(DialogTitle, { children: detailSession.title }),
                    jsx(DialogDescription, { children: 'Session details (read-only)' }),
                  ],
                }),
                jsxs('div', {
                  className: 'bse-detail-grid',
                  children: [
                    jsx('span', { className: 'bse-detail-key', children: 'Session ID' }),
                    jsx('span', { className: 'bse-detail-val', children: detailSession.storedId }),
                    jsx('span', { className: 'bse-detail-key', children: 'Profile' }),
                    jsx('span', { className: 'bse-detail-val', children: detailSession.profile }),
                    jsx('span', { className: 'bse-detail-key', children: 'Gateway' }),
                    jsx('span', { className: 'bse-detail-val', children: detailSession.gateway }),
                    jsx('span', { className: 'bse-detail-key', children: 'Type' }),
                    jsx('span', {
                      className: 'bse-detail-val',
                      children: SESSION_TYPE_LABELS[detailSession.sessionType] || detailSession.sessionType,
                    }),
                    jsx('span', { className: 'bse-detail-key', children: 'Status' }),
                    jsx('span', { className: 'bse-detail-val', children: detailSession.status }),
                    jsx('span', { className: 'bse-detail-key', children: 'Last activity' }),
                    jsx('span', {
                      className: 'bse-detail-val',
                      children: detailSession.updatedAt
                        ? (typeof fmtDateTime?.format === 'function'
                            ? fmtDateTime.format(detailSession.updatedAt)
                            : new Date(detailSession.updatedAt).toLocaleString())
                        : '—',
                    }),
                    jsx('span', { className: 'bse-detail-key', children: 'Messages' }),
                    jsx('span', { className: 'bse-detail-val', children: String(detailSession.messageCount ?? 0) }),
                    jsx('span', { className: 'bse-detail-key', children: 'Model' }),
                    jsx('span', { className: 'bse-detail-val', children: detailSession.model || '—' }),
                  ],
                }),
                jsxs(DialogFooter, {
                  children: [
                    jsx(Button, {
                      variant: 'outline',
                      onClick: () => {
                        writeClipboardText?.(detailSession.storedId)
                        host.notify?.({ kind: 'info', message: 'Session ID copied' })
                      },
                      children: 'Copy ID',
                    }),
                    jsx(Button, {
                      onClick: () => {
                        const target = detailSession
                        setDetailSession(null)
                        if (selectedBot) openSessionInHermes(selectedBot, target)
                      },
                      children: 'Open',
                    }),
                  ],
                }),
              ],
            })
          : null,
      }),

      jsx(Dialog, {
        open: Boolean(deleteTarget),
        onOpenChange: (open) => {
          if (!open && !deleting) setDeleteTarget(null)
        },
        children: deleteTarget
          ? jsxs(DialogContent, {
              children: [
                jsxs(DialogHeader, {
                  children: [
                    jsx(DialogTitle, {
                      children:
                        deleteTarget.mode === 'empty'
                          ? `Delete ${deleteTarget.sessions.length} empty session(s)?`
                          : 'Delete this session?',
                    }),
                    jsx(DialogDescription, {
                      children:
                        deleteTarget.mode === 'empty'
                          ? `All empty sessions for ${selectedBot?.title || 'this bot'} will be permanently deleted.`
                          : `Session "${deleteTarget.session?.title || ''}" (${deleteTarget.session?.storedId || ''}) will be permanently deleted.`,
                    }),
                  ],
                }),
                jsxs(DialogFooter, {
                  children: [
                    jsx(Button, {
                      variant: 'outline',
                      disabled: deleting,
                      onClick: () => setDeleteTarget(null),
                      children: 'Cancel',
                    }),
                    jsx(Button, {
                      variant: 'destructive',
                      disabled: deleting,
                      onClick: async () => {
                        if (!selectedBot || !deleteTarget) return
                        setDeleting(true)
                        try {
                          const list =
                            deleteTarget.mode === 'empty' ? deleteTarget.sessions : [deleteTarget.session]
                          let okCount = 0
                          let lastErr = null
                          for (const s of list) {
                            try {
                              await deleteSessionRpc(selectedBot, s.storedId)
                              okCount += 1
                            } catch (err) {
                              lastErr = err
                            }
                          }
                          setDeleteTarget(null)
                          if (okCount > 0) {
                            host.notify?.({
                              kind: 'success',
                              message:
                                okCount === 1
                                  ? 'Session deleted'
                                  : `${okCount} sessions deleted`,
                            })
                          }
                          if (lastErr && okCount === 0) {
                            const msg = String(lastErr?.message || lastErr || '')
                            if (msg.toLowerCase().includes('active session')) {
                              host.notify?.({
                                kind: 'error',
                                title: 'Could not delete session',
                                message: 'This session is currently open or active in Hermes. Close its tab and try again.',
                              })
                            } else {
                              host.notifyError?.(lastErr, 'Could not delete session')
                            }
                          }
                          queryClient.invalidateQueries({ queryKey: [PLUGIN_ID, 'sessions', selectedBot.key] })
                          queryClient.invalidateQueries({ queryKey: [PLUGIN_ID, 'roster'] })
                          queryClient.invalidateQueries({ queryKey: [PLUGIN_ID, 'messages'] })
                        } finally {
                          setDeleting(false)
                        }
                      },
                      children: deleting ? 'Deleting…' : 'Delete',
                    }),
                  ],
                }),
              ],
            })
          : null,
      }),
    ],
  })
}

export default {
  id: PLUGIN_ID,
  name: 'Bots & Sessions',
  description: 'Two-column explorer for local and remote bots and their sessions.',
  defaultEnabled: true,
  register(ctx) {
    const openPane = () => {
      host.undismissPane?.(`${PLUGIN_ID}:explorer`)
      host.revealPane?.(`${PLUGIN_ID}:explorer`)
    }

    ctx.registerMany([
      {
        id: 'explorer',
        area: 'panes',
        title: 'Bots & Sessions',
        data: {
          placement: 'main',
          dock: { pane: 'workspace', pos: 'left', enforce: true },
          width: '520px',
          collapsible: true,
        },
        render: () => jsx(BotSessionsExplorerPage, { ctx }),
      },
      {
        id: 'open',
        area: PALETTE_AREA,
        data: {
          id: `${PLUGIN_ID}.open`,
          label: 'Open Bots & Sessions',
          keywords: ['bots', 'sessions', 'explorer', 'gateway'],
          run: openPane,
        },
      },
      {
        id: 'chip',
        area: 'statusBar.right',
        order: 120,
        render: () =>
          jsxs('button', {
            type: 'button',
            title: 'Open Bots & Sessions',
            onClick: openPane,
            style: {
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '0 6px',
              fontSize: '0.6875rem',
              color: 'var(--ui-text-tertiary)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            },
            children: [
              jsx(Codicon, { name: 'organization', size: '0.7rem' }),
              jsx('span', { children: 'Bots' }),
            ],
          }),
      },
    ])

    ctx.setTimeout(() => {
      openPane()
    }, 150)
  },
}
