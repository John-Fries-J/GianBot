const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

// Data storage
const TIPS_FILE = path.join(__dirname, 'tips_data.json');

async function loadTipsData() {
    try {
        const data = await fs.readFile(TIPS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { tips: {}, pendingTips: {}, multiTips: {}, stats: { allTime: { bets: 0, wins: 0, losses: 0, profit: 0 } } };
    }
}

async function saveTipsData(data) {
    await fs.writeFile(TIPS_FILE, JSON.stringify(data, null, 2));
}
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tips')
        .setDescription('Manage betting tips')
        .addSubcommand(subcommand =>
            subcommand
                .setName('send')
                .setDescription('Send a tip to a channel using an ID')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel to send the tip to')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText)
                )
                .addStringOption(option =>
                    option.setName('id')
                        .setDescription('Tip ID from /tips create')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new tip or multi-tip')
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('Title of the tip')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('match')
                        .setDescription('Match details')
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option.setName('market')
                        .setDescription('Betting market')
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option.setName('selection')
                        .setDescription('Market selection')
                        .setRequired(false)
                )
                .addNumberOption(option =>
                    option.setName('odds')
                        .setDescription('Betting odds')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a tip to a multi-tip')
                .addStringOption(option =>
                    option.setName('id')
                        .setDescription('Multi-tip ID')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('match')
                        .setDescription('Match details')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('market')
                        .setDescription('Betting market')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('selection')
                        .setDescription('Market selection')
                        .setRequired(true)
                )
                .addNumberOption(option =>
                    option.setName('odds')
                        .setDescription('Betting odds')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('send-multi')
                .setDescription('Send a multi-tip to a channel')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel to send the multi-tip to')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText)
                )
                .addStringOption(option =>
                    option.setName('id')
                        .setDescription('Multi-tip ID')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('update')
                .setDescription('Update tip result')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('Message ID of the tip')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('result')
                        .setDescription('Result of the tip')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Win', value: 'win' },
                            { name: 'Loss', value: 'loss' }
                        )
                )
                .addNumberOption(option =>
                    option.setName('stake')
                        .setDescription('Stake amount for P/L calculation')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('Show betting statistics')
                .addStringOption(option =>
                    option.setName('timeframe')
                        .setDescription('Timeframe for stats')
                        .setRequired(true)
                        .addChoices(
                            { name: 'All Time', value: 'allTime' },
                            { name: 'Last 30 Days', value: '30days' },
                            { name: 'Last 7 Days', value: '7days' }
                        )
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const data = await loadTipsData();
        const blue = '#0000FF';

        if (subcommand === 'send') {
            const channel = interaction.options.getChannel('channel');
            const id = interaction.options.getString('id');

            if (!data.pendingTips[id]) {
                return interaction.reply({ content: 'Invalid tip ID', ephemeral: true });
            }

            const tip = data.pendingTips[id];
            const embed = new EmbedBuilder()
                .setTitle(tip.title)
                .setDescription(tip.isMulti ? 'Multi-Tip' : 'New Betting Tip')
                .setColor(blue)
                .setTimestamp();

            if (tip.isMulti) {
                tip.tips.forEach((t, index) => {
                    embed.addFields({
                        name: `Tip ${index + 1}`,
                        value: `**Match**: ${t.match}\n**Market**: ${t.market}\n**Selection**: ${t.selection}\n**Odds**: ${t.odds}\n**Status**: ${t.status}`,
                        inline: true
                    });
                });
            } else {
                embed.addFields(
                    { name: 'Match', value: tip.match, inline: true },
                    { name: 'Market', value: tip.market, inline: true },
                    { name: 'Selection', value: tip.selection, inline: true },
                    { name: 'Odds', value: tip.odds.toString(), inline: true },
                    { name: 'Status', value: 'Pending', inline: true }
                );
            }

            const message = await channel.send({ embeds: [embed] });

            data.tips[message.id] = {
                ...tip,
                status: 'pending',
                createdAt: new Date().toISOString(),
                channelId: channel.id
            };

            delete data.pendingTips[id];
            await saveTipsData(data);
            await interaction.reply({ content: `${tip.isMulti ? 'Multi-tip' : 'Tip'} sent successfully!`, ephemeral: true });
        }

        else if (subcommand === 'create') {
            const title = interaction.options.getString('title');
            const match = interaction.options.getString('match');
            const market = interaction.options.getString('market');
            const selection = interaction.options.getString('selection');
            const odds = interaction.options.getNumber('odds');
            const id = generateId();

            if (match && market && selection && odds) {
                data.pendingTips[id] = {
                    title,
                    match,
                    market,
                    selection,
                    odds,
                    isMulti: false,
                    createdAt: new Date().toISOString()
                };
            } else {
                data.pendingTips[id] = {
                    title,
                    tips: [],
                    isMulti: true,
                    createdAt: new Date().toISOString()
                };
            }

            await saveTipsData(data);
            await interaction.reply({ content: `${match ? 'Tip' : 'Multi-tip'} created with ID: ${id}`, ephemeral: true });
        }

        else if (subcommand === 'add') {
            const id = interaction.options.getString('id');
            const match = interaction.options.getString('match');
            const market = interaction.options.getString('market');
            const selection = interaction.options.getString('selection');
            const odds = interaction.options.getNumber('odds');

            if (!data.pendingTips[id] || !data.pendingTips[id].isMulti) {
                return interaction.reply({ content: 'Invalid multi-tip ID', ephemeral: true });
            }

            data.pendingTips[id].tips.push({
                match,
                market,
                selection,
                odds,
                status: 'pending'
            });

            await saveTipsData(data);
            await interaction.reply({ content: 'Tip added to multi-tip successfully!', ephemeral: true });
        }

        else if (subcommand === 'send-multi') {
            const channel = interaction.options.getChannel('channel');
            const id = interaction.options.getString('id');
            if (!data.pendingTips[id] || !data.pendingTips[id].isMulti) {
                return interaction.reply({ content: 'Invalid multi-tip ID', ephemeral: true });
            }
            const multiTip = data.pendingTips[id];
            const embed = new EmbedBuilder()
                .setTitle(multiTip.title)
                .setDescription('Multi-Tip')
                .setColor(blue)
                .setTimestamp();
            multiTip.tips.forEach((tip, index) => {
                embed.addFields({
                    name: `Tip ${index + 1}`,
                    value: `**Match**: ${tip.match}\n**Market**: ${tip.market}\n**Selection**: ${tip.selection}\n**Odds**: ${tip.odds}\n**Status**: ${tip.status}`,
                    inline: true
                });
            });
            const message = await channel.send({ embeds: [embed] });
            data.tips[message.id] = {
                ...multiTip,
                status: 'pending',
                createdAt: new Date().toISOString(),
                channelId: channel.id
            };
            delete data.pendingTips[id];
            await saveTipsData(data);
            await interaction.reply({ content: 'Multi-tip sent successfully!', ephemeral: true });
        }
        else if (subcommand === 'update') {
            const messageId = interaction.options.getString('message_id');
            const result = interaction.options.getString('result');
            const stake = interaction.options.getNumber('stake');

            if (!data.tips[messageId]) {
                return interaction.reply({ content: 'Invalid message ID', ephemeral: true });
            }
            const tip = data.tips[messageId];
            const channel = interaction.guild.channels.cache.get(tip.channelId);
            try {
                const message = await channel.messages.fetch(messageId);
                const embed = EmbedBuilder.from(message.embeds[0]);

                if (tip.isMulti) {
                    tip.tips.forEach(t => {
                        t.status = result;
                    });
                    embed.spliceFields(0, embed.data.fields.length);
                    tip.tips.forEach((t, index) => {
                        embed.addFields({
                            name: `Tip ${index + 1}`,
                            value: `**Match**: ${t.match}\n**Market**: ${t.market}\n**Selection**: ${t.selection}\n**Odds**: ${t.odds}\n**Status**: ${t.status}`,
                            inline: true
                        });
                    });
                } else {
                    embed.spliceFields(embed.data.fields.findIndex(field => field.name === 'Status'), 1, {
                        name: 'Status',
                        value: result.charAt(0).toUpperCase() + result.slice(1),
                        inline: true
                    });
                }

                await message.edit({ embeds: [embed] });
                const odds = tip.isMulti ? tip.tips.reduce((acc, t) => acc * t.odds, 1) : tip.odds;
                const profit = result === 'win' ? (stake * (odds - 1)) : -stake;
                data.stats.allTime.bets += 1;
                data.stats.allTime[result === 'win' ? 'wins' : 'losses'] += 1;
                data.stats.allTime.profit += profit;
                tip.status = result;
                tip.stake = stake;
                await saveTipsData(data);
                await interaction.reply({ content: 'Tip updated successfully!', ephemeral: true });
            } catch (error) {
                await interaction.reply({ content: 'Error updating tip: ' + error.message, ephemeral: true });
            }
        }

        else if (subcommand === 'stats') {
            const timeframe = interaction.options.getString('timeframe');
            let stats = data.stats.allTime;
            let filteredTips = Object.values(data.tips);

            if (timeframe !== 'allTime') {
                const days = timeframe === '30days' ? 30 : 7;
                const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

                filteredTips = filteredTips.filter(tip =>
                    new Date(tip.createdAt) >= cutoff &&
                    tip.status !== 'pending'
                );

                stats = filteredTips.reduce((acc, tip) => {
                    const isWin = tip.status === 'win';
                    const odds = tip.isMulti ? tip.tips.reduce((a, t) => a * t.odds, 1) : tip.odds;
                    const profit = isWin ? (tip.stake * (odds - 1)) : -tip.stake;
                    return {
                        bets: acc.bets + 1,
                        wins: acc.wins + (isWin ? 1 : 0),
                        losses: acc.losses + (!isWin ? 1 : 0),
                        profit: acc.profit + (profit || 0)
                    };
                }, { bets: 0, wins: 0, losses: 0, profit: 0 });
            }

            const embed = new EmbedBuilder()
                .setTitle(`Betting Stats (${timeframe.replace('days', ' Days')})`)
                .addFields(
                    { name: 'Total Bets', value: stats.bets.toString(), inline: true },
                    { name: 'Winning Selections', value: stats.wins.toString(), inline: true },
                    { name: 'Losing Selections', value: stats.losses.toString(), inline: true },
                    { name: 'Total P/L', value: stats.profit.toFixed(2), inline: true }
                )
                .setColor(blue)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        }
    },
};