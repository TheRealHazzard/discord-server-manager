import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('prune-roleless')
    .setDescription('Find (and optionally kick) members with no roles who joined long ago')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addIntegerOption((opt) =>
      opt
        .setName('days')
        .setDescription('Only consider members who joined more than this many days ago (default 7)')
        .setMinValue(0)
        .setRequired(false),
    )
    .addBooleanOption((opt) =>
      opt
        .setName('confirm')
        .setDescription('Set true to actually kick. Omitted/false = dry-run report only.')
        .setRequired(false),
    ),

  async execute(interaction) {
    const days = interaction.options.getInteger('days') ?? 7;
    const confirm = interaction.options.getBoolean('confirm') ?? false;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const members = await interaction.guild.members.fetch();
    const targets = members.filter(
      (m) => !m.user.bot && m.roles.cache.size === 1 && m.joinedTimestamp && m.joinedTimestamp < cutoff,
    );

    if (targets.size === 0) {
      await interaction.editReply(`No roleless members found who joined more than ${days} day(s) ago.`);
      return;
    }

    const names = [...targets.values()].map((m) => m.user.tag).join(', ');

    if (!confirm) {
      await interaction.editReply(
        `Dry run: ${targets.size} member(s) with no roles, joined >${days}d ago:\n${names}\n\nRe-run with \`confirm:true\` to kick them.`,
      );
      return;
    }

    let kicked = 0;
    for (const member of targets.values()) {
      try {
        await member.kick('Pruned: no roles, inactive since join');
        kicked++;
      } catch (err) {
        console.error(`Failed to kick ${member.user.tag}:`, err);
      }
    }

    await interaction.editReply(`Kicked ${kicked} of ${targets.size} roleless member(s).`);
  },
};
