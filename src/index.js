import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, Collection, MessageFlags } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ],
  partials: [Partials.GuildMember],
});

client.commands = new Collection();

const commandsDir = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsDir).filter((f) => f.endsWith('.js'))) {
  const { default: command } = await import(pathToFileURL(path.join(commandsDir, file)));
  client.commands.set(command.data.name, command);
}

client.once('clientReady', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`Error running /${interaction.commandName}:`, err);
    const payload = {
      content: 'Something went wrong running that command.',
      flags: MessageFlags.Ephemeral,
    };
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload);
      } else {
        await interaction.reply(payload);
      }
    } catch (replyErr) {
      // The interaction token can already be dead here (e.g. it expired before we
      // even got to defer) — don't let a failed error-report crash the process.
      console.error(`Failed to report error for /${interaction.commandName}:`, replyErr);
    }
  }
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

client.login(process.env.DISCORD_TOKEN);
