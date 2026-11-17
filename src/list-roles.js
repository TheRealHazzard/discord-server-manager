import 'dotenv/config';
import { Client, GatewayIntentBits, PermissionsBitField } from 'discord.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

client.once('clientReady', async () => {
  const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
  await guild.roles.fetch();
  await guild.members.fetch();

  const everyone = guild.roles.everyone;
  const roles = [...guild.roles.cache.values()]
    .filter((r) => r.id !== guild.id)
    .sort((a, b) => b.position - a.position);

  for (const r of roles) {
    const extraPerms = new PermissionsBitField(r.permissions.bitfield & ~everyone.permissions.bitfield);
    console.log('----');
    console.log(`name: ${r.name}`);
    console.log(`id: ${r.id}`);
    console.log(`members: ${r.members.size}`);
    console.log(`managed (bot/integration role): ${r.managed}`);
    console.log(`hoisted: ${r.hoist} | mentionable: ${r.mentionable} | color: ${r.hexColor}`);
    console.log(`position: ${r.position}`);
    console.log(`extra perms over @everyone: ${extraPerms.toArray().join(', ') || 'none'}`);
  }
  console.log(`\nTotal roles (excl @everyone): ${roles.length}`);

  await client.destroy();
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
