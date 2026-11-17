import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } from 'discord.js';

const WORDLE_APP_ID = '1211781489931452447'; // the "Wordle" Discord app's applicationId/webhookId
const WEBHOOK_NAME = 'Wordle Archive';
const DEFAULT_DEST_HINT = 'wordle'; // reuse any existing channel whose name contains this
const SCAN_CAP = 20000; // safety cap on how many messages to page through per run

function isWordleMessage(msg) {
  return msg.applicationId === WORDLE_APP_ID || msg.webhookId === WORDLE_APP_ID;
}

export default {
  data: new SlashCommandBuilder()
    .setName('sweep-wordle')
    .setDescription('Move Wordle result messages out of a channel into a dedicated one')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages | PermissionFlagsBits.ManageWebhooks)
    .addChannelOption((opt) =>
      opt
        .setName('source')
        .setDescription('Channel to sweep Wordle messages out of')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true),
    )
    .addChannelOption((opt) =>
      opt
        .setName('destination')
        .setDescription('Channel to move them into (default: reuses an existing #*wordle* channel, else creates one)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false),
    )
    .addBooleanOption((opt) =>
      opt
        .setName('confirm')
        .setDescription('Set true to actually move+delete. Omitted/false = dry-run report only.')
        .setRequired(false),
    ),

  async execute(interaction) {
    const source = interaction.options.getChannel('source');
    let destination = interaction.options.getChannel('destination');
    const confirm = interaction.options.getBoolean('confirm') ?? false;
    const guild = interaction.guild;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const sourceChannel = await guild.channels.fetch(source.id);

    // Page through history, oldest-last per batch; collect matches in chronological order.
    const matches = [];
    let before;
    let scanned = 0;
    while (scanned < SCAN_CAP) {
      const batch = await sourceChannel.messages.fetch({ limit: 100, ...(before && { before }) });
      if (batch.size === 0) break;
      scanned += batch.size;
      for (const msg of batch.values()) {
        if (isWordleMessage(msg)) matches.push(msg);
      }
      before = batch.last().id;
      if (batch.size < 100) break;
    }
    matches.reverse(); // chronological, oldest first

    if (matches.length === 0) {
      await interaction.editReply(
        `No Wordle messages found in ${source} (scanned ${scanned} message(s)${scanned >= SCAN_CAP ? ', hit scan cap' : ''}).`,
      );
      return;
    }

    if (!confirm) {
      const preview = matches
        .slice(0, 5)
        .map((m) => `${m.author.username}: ${m.content.split('\n')[0]}`)
        .join('\n');
      await interaction.editReply(
        `Dry run: found ${matches.length} Wordle message(s) in ${source} (scanned ${scanned}).\n\nPreview:\n${preview}${matches.length > 5 ? `\n...and ${matches.length - 5} more` : ''}\n\nRe-run with \`confirm:true\` to move them.`,
      );
      return;
    }

    if (!destination) {
      destination =
        guild.channels.cache.find(
          (c) =>
            c.type === ChannelType.GuildText &&
            c.id !== sourceChannel.id &&
            c.name.toLowerCase().includes(DEFAULT_DEST_HINT),
        ) ??
        (await guild.channels.create({
          name: 'wordle-results',
          type: ChannelType.GuildText,
          parent: sourceChannel.parentId ?? undefined,
        }));
    } else {
      destination = await guild.channels.fetch(destination.id);
    }

    const webhooks = await destination.fetchWebhooks();
    const webhook =
      webhooks.find((w) => w.name === WEBHOOK_NAME) ??
      (await destination.createWebhook({ name: WEBHOOK_NAME }));

    const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const toDelete = [];
    let moved = 0;
    let failed = 0;

    for (const msg of matches) {
      try {
        const files = [...msg.attachments.values()].map((a) => a.url);
        const embeds = msg.embeds.slice(0, 10);
        const content = msg.content.slice(0, 2000);
        await webhook.send({
          content: content || (files.length === 0 && embeds.length === 0 ? '[no content]' : undefined),
          username: msg.member?.displayName ?? msg.author.username,
          avatarURL: msg.author.displayAvatarURL(),
          files,
          embeds,
        });
        toDelete.push(msg);
        moved++;
      } catch (err) {
        console.error(`Failed to repost message ${msg.id}:`, err);
        failed++;
      }
    }

    const bulkDeletable = toDelete.filter((m) => m.createdTimestamp > fourteenDaysAgo);
    const individually = toDelete.filter((m) => m.createdTimestamp <= fourteenDaysAgo);

    if (bulkDeletable.length > 0) {
      await sourceChannel.bulkDelete(bulkDeletable, true);
    }
    for (const msg of individually) {
      try {
        await msg.delete();
      } catch (err) {
        console.error(`Failed to delete old message ${msg.id}:`, err);
      }
    }

    await interaction.editReply(
      `Moved ${moved} Wordle message(s) from ${source} to ${destination}` +
        (failed ? `, ${failed} failed to repost and were left in place` : '') +
        `.`,
    );
  },
};
