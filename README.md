# discord-server-manager

A small discord.js bot for tidying up a server: structural audit, message purging,
pruning roleless/inactive members, and archiving old channels. Destructive commands
default to a dry-run report and only act with an explicit `confirm:true` option.

## Setup

1. Create an application + bot at https://discord.com/developers/applications
   - Bot tab → Reset Token → copy it
   - OAuth2 → URL Generator → scopes: `bot`, `applications.commands`;
     bot permissions: at minimum `Manage Guild`, `Manage Channels`, `Manage Messages`, `Kick Members`
   - Use the generated URL to invite the bot to your server
   - Under Bot settings, enable the **Server Members Intent** (required for member fetching)

2. Copy `.env.example` to `.env` and fill in:
   - `DISCORD_TOKEN` — the bot token
   - `DISCORD_CLIENT_ID` — the application ID (General Information tab)
   - `DISCORD_GUILD_ID` — your server ID (enable Developer Mode in Discord, right-click server → Copy Server ID)

3. Install dependencies and register commands:
   ```
   npm install
   npm run deploy-commands
   npm start
   ```

## Commands

- `/audit` — reports empty categories, uncategorized channels, unused/redundant roles
- `/purge channel amount [confirm]` — bulk-delete recent messages (dry-run unless `confirm:true`)
- `/prune-roleless [days] [confirm]` — find/kick members with no roles who joined >N days ago
- `/archive-channel channel` — moves a channel into an "Archive" category and locks it for @everyone

All commands are restricted to members with the relevant Discord permission
(Manage Guild / Manage Channels / Manage Messages / Kick Members) via
`setDefaultMemberPermissions`, on top of whatever role restrictions you set in
Discord's Integrations settings.
