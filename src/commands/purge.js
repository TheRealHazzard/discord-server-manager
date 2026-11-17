import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Bulk-delete recent messages in a channel (dry-run by default)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addChannelOption((opt) =>
      opt
        .setName('channel')
        .setDescription('Channel to purge')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true),
    )
    .addIntegerOption((opt) =>
      opt
        .setName('amount')
        .setDescription('How many recent messages to consider (max 100, Discord API limit)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true),
    )
    .addBooleanOption((opt) =>
      opt
        .setName('confirm')
        .setDescription('Set true to actually delete. Omitted/false = dry-run report only.')
        .setRequired(false),
    ),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const amount = interaction.options.getInteger('amount');
    const confirm = interaction.options.getBoolean('confirm') ?? false;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const messages = await channel.messages.fetch({ limit: amount });
    // Discord only allows bulk-deleting messages younger than 14 days.
    const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const deletable = messages.filter((m) => m.createdTimestamp > fourteenDaysAgo);
    const tooOld = messages.size - deletable.size;

    if (!confirm) {
      await interaction.editReply(
        `Dry run: ${deletable.size} of ${messages.size} fetched messages in ${channel} are eligible for bulk delete` +
          (tooOld ? ` (${tooOld} older than 14 days, would need individual deletion).` : '.') +
          `\nRe-run with \`confirm:true\` to actually delete.`,
      );
      return;
    }

    const deleted = await channel.bulkDelete(deletable, true);
    await interaction.editReply(
      `Deleted ${deleted.size} messages in ${channel}.` +
        (tooOld ? ` ${tooOld} messages were older than 14 days and were left alone.` : ''),
    );
  },
};
