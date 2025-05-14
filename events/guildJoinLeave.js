module.exports = {
    name: 'guildCreate',
    once: false,
    execute(guild) {
        console.log(`Joined a new guild: ${guild.name}`);
    },
};
module.exports = {
    name: 'guildDelete',
    once: false,
    execute(guild) {
        console.log(`Left a guild: ${guild.name}`);
    },
};
