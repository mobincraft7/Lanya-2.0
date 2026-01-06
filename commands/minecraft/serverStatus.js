// commands/minecraft/serverStatus.js — FINAL 100% WORKING
const axios = require('axios');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverstatus')
    .setDescription('Get the status of a Minecraft server.')
    .addStringOption(option =>
      option
        .setName('serverip')
        .setDescription('The IP address of the Minecraft server.')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('gamemode')
        .setDescription('The game mode of the server (Java or Bedrock).')
        .setRequired(true)
        .addChoices(
          { name: 'Java', value: 'java' },
          { name: 'Bedrock', value: 'bedrock' }
        )
    ),

  async execute(interaction) {
    const serverIp = interaction.options.getString('serverip');
    const gameMode = interaction.options.getString('gamemode');

    const apiUrl = gameMode === 'java'
      ? `https://api.mcsrvstat.us/2/${serverIp}`
      : `https://api.mcsrvstat.us/bedrock/2/${serverIp}`;

    await interaction.deferReply();

    try {
      const { data } = await axios.get(apiUrl);

      if (data.offline || !data.ip) {
        const offlineEmbed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('❌ Server Offline')
          .setDescription(`The server at \`${serverIp}\` is currently offline or unreachable.`)
          .setFooter({ text: 'Last updated' })
          .setTimestamp();

        return await interaction.editReply({ embeds: [offlineEmbed] });
      }

      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle(`🟢 ${serverIp} - Online`)
        .setThumbnail(`https://api.mcsrvstat.us/icon/${serverIp}`)
        .addFields(
          {
            name: '🗺 Hostname',
            value: data.hostname ? `\`${data.hostname}\`` : 'Unknown',
            inline: true
          },
          {
            name: '📊 Players',
            value: `\`${data.players?.online || 0}\` / \`${data.players?.max || 0}\``,
            inline: true
          },
          {
            name: '🔧 Version',
            value: data.version ? `\`${data.version}\`` : 'Unknown',
            inline: true
          },
          {
            name: '🌐 Port',
            value: `\`${data.port}\``,
            inline: true
          },
          {
            name: '📡 MOTD',
            value: data.motd?.clean?.join('\n') || 'No MOTD',
            inline: false
          }
        )
        .setFooter({ text: 'Last updated' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('ServerStatus Error:', error.message);
      await interaction.editReply({ content: `❌ Could not fetch status for \`${serverIp}\`. Please check the IP and try again.` });
    }
  }
};
