import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const commandsDir = path.join(__dirname, 'commands');

const commands = [];
for (const file of fs.readdirSync(commandsDir).filter((f) => f.endsWith('.js'))) {
  const { default: command } = await import(pathToFileURL(path.join(commandsDir, file)));
  commands.push(command.data.toJSON());
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

const { DISCORD_CLIENT_ID, DISCORD_GUILD_ID } = process.env;
if (!DISCORD_CLIENT_ID || !DISCORD_GUILD_ID) {
  throw new Error('DISCORD_CLIENT_ID and DISCORD_GUILD_ID must be set in .env');
}

const data = await rest.put(
  Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID),
  { body: commands },
);

console.log(`Registered ${data.length} guild command(s).`);
