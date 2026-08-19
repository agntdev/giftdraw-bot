# Gift Picker Bot — Bot specification

**Archetype:** community

**Voice:** friendly and encouraging — write every user-facing message, button label, error, and empty state in this voice.

Passively evaluates every non-bot user message for a gift draw (5% by default). A
bounded in-memory LRU of recent active human authors supplies the winner pool, so
the same person may win any number of times. Admins control behavior via commands.
Winners are announced immediately in the same chat.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- Telegram group admins
- community members

## Success criteria

- Random winner announced with 5% probability on user messages
- Admin commands for configuration
- Correct exclusion of bots and self

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Open main menu (admins see configuration options)
- **/enable** (command, actor: admin, command: /enable) — Enable gift draws in this chat
- **/disable** (command, actor: admin, command: /disable) — Disable gift draws in this chat
- **/chance** (command, actor: admin, command: /chance <percent>) — Set selection probability percentage
- **/lastdraw** (command, actor: admin, command: /lastdraw) — Show last winner information

## Flows

### message_monitoring
_Trigger:_ user message

1. Check if chat is enabled
2. Generate 5% probability check
3. If hit, select random eligible member
4. Announce winner in chat

_Data touched:_ ChatConfig, DrawEvent

### admin_configuration
_Trigger:_ /enable|/disable|/chance|/lastdraw

1. Verify admin status
2. Update chat configuration
3. Send confirmation response

_Data touched:_ ChatConfig

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **ChatConfig** _(retention: persistent)_ — Per-chat configuration settings
  - fields: enabled, selection_chance, last_draw_timestamp, last_winner_id
- **DrawEvent** _(retention: persistent)_ — Record of each selection event
  - fields: timestamp, winner_id, chat_id

## Integrations

- **Telegram** (required) — Bot API messaging and group monitoring
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- /enable
- /disable
- /chance <percent>
- /lastdraw

## Notifications

- Winner announcements in chat with format: '🎁 Победитель: @username!'

## Permissions & privacy

- Only group admins can configure bot behavior
- Excludes bot accounts and self from eligibility
- Stores minimal chat configuration and last winner data

## Edge cases

- No eligible members in chat
- Selected winner has no username
- Message from non-admin trying to use admin commands

## Required tests

- Verify 5% probability selection accuracy
- Test admin command access restrictions
- Validate bot self-exclusion
- Confirm winner announcement formatting

## Assumptions

- Default 5% chance is owner-preferred
- Telegram's built-in RNG used for selections
- Display name fallback when no username exists
