import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('audit')
    .setDescription('Report structural issues: empty categories, uncategorized channels, unused roles')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const guild = interaction.guild;

    await guild.channels.fetch();
    await guild.roles.fetch();
    await guild.members.fetch();

    const channels = [...guild.channels.cache.values()];
    const categories = channels.filter((c) => c.type === ChannelType.GuildCategory);
    const nonCategory = channels.filter((c) => c.type !== ChannelType.GuildCategory);

    const emptyCategories = categories.filter(
      (cat) => !nonCategory.some((c) => c.parentId === cat.id),
    );
    const uncategorized = nonCategory.filter((c) => !c.parentId);

    const unusedRoles = guild.roles.cache.filter(
      (r) => !r.managed && r.id !== guild.id && r.members.size === 0,
    );

    const redundantRoles = guild.roles.cache.filter((r) => {
      if (r.managed || r.id === guild.id || r.members.size === 0) return false;
      const everyone = guild.roles.everyone.permissions;
      return r.permissions.bitfield === everyone.bitfield;
    });

    const lines = [];
    lines.push(`**Empty categories** (${emptyCategories.length}): ${list(emptyCategories)}`);
    lines.push(`**Uncategorized channels** (${uncategorized.length}): ${list(uncategorized)}`);
    lines.push(`**Unused roles, 0 members** (${unusedRoles.size}): ${list([...unusedRoles.values()])}`);
    lines.push(
      `**Roles with no extra permissions over @everyone** (${redundantRoles.size}): ${list([...redundantRoles.values()])}`,
    );

    await interaction.editReply(lines.join('\n\n').slice(0, 1900));
  },
};

function list(items) {
  if (items.length === 0) return 'none';
  return items.map((i) => `\`${i.name}\``).join(', ');
}
