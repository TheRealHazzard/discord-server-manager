import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } from 'discord.js';

const ARCHIVE_CATEGORY_NAME = 'Archive';

export default {
  data: new SlashCommandBuilder()
    .setName('archive-channel')
    .setDescription('Move a channel into an Archive category and lock it for @everyone')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption((opt) =>
      opt.setName('channel').setDescription('Channel to archive').setRequired(true),
    ),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const guild = interaction.guild;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    let archiveCategory = guild.channels.cache.find(
      (c) => c.type === ChannelType.GuildCategory && c.name === ARCHIVE_CATEGORY_NAME,
    );
    if (!archiveCategory) {
      archiveCategory = await guild.channels.create({
        name: ARCHIVE_CATEGORY_NAME,
        type: ChannelType.GuildCategory,
      });
    }

    const target = await guild.channels.fetch(channel.id);
    await target.setParent(archiveCategory.id, { lockPermissions: false });
    await target.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });

    await interaction.editReply(`Moved ${target} into **${ARCHIVE_CATEGORY_NAME}** and locked it for @everyone.`);
  },
};
