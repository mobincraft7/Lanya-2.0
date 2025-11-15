const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const ServerStatus = require('../models/ServerStatus');
const mongoose = require('mongoose'); // اضافه شد

module.exports = async (client) => {
  const updateServerStatus = async () => {
    // چک کن دیتابیس وصل باشه
    if (mongoose.connection.readyState !== 1) {
      console.log('ServerStatus Updater: DB not connected. Skipping update...');
      return;
    }

    let servers;
    try {
      servers = await ServerStatus.find().lean(); // .lean() اضافه شد + try/catch
    } catch (error) {
      if (error.message.includes('buffering timed out')) {
        console.error('ServerStatus Updater: DB timeout - reconnecting...');
        // reconnect رو trigger کن (اگر تابع connectDB داری)
        const { connectDB } = require('../../index');
        connectDB();
      } else {
        console.error('ServerStatus Updater: Failed to fetch servers:', error);
      }
      return;
    }

    if (!servers || servers.length === 0) {
      console.log('No servers configured for status update.');
      return;
    }

    const nextUpdateTimestamp = Date.now() + 30000;
    const nextUpdateDiscordTimestamp = Math.floor(nextUpdateTimestamp / 1000);
    const formattedTimestamp = `<t:${nextUpdateDiscordTimestamp}:R>`;

    for (const server of servers) {
      const { guildId, channelId, serverName, serverIp, gameMode, messageId } = server;
      const guild = await client.guilds.fetch(guildId).catch(() => null);
      if (!guild) continue;

      const channel = guild.channels.cache.get(channelId);
      if (!channel || !channel.isTextBased()) continue;

      const apiUrl =
        gameMode === 'java'
          ? `https://api.mcsrvstat.us/1/${serverIp}`
          : `https://api.mcsrvstat.us/bedrock/1/${serverIp}`;

      try {
        const { data } = await axios.get(apiUrl, { timeout: 8000 }); // timeout برای axios

        const embed = new EmbedBuilder()
          .setColor(data.offline ? '#FF0000' : '#008080')
          .setTitle(data.offline ? 'Server Offline' : serverName)
          .setDescription(
            data.offline
              ? `The server \`${serverIp}\` is currently offline.`
              : '**Server Online**'
          )
          .addFields({
            name: 'Next Update',
            value: formattedTimestamp,
            inline: true,
          })
          .setFooter({
            text: 'Last updated',
            iconURL: `https://api.mcstatus.io/v2/icon/${serverIp}`,
          })
          .setThumbnail(`https://api.mcstatus.io/v2/icon/${serverIp}`)
          .setTimestamp();

        if (!data.offline) {
          embed.addFields(
            { name: 'IP Address', value: `\`${data.ip}\``, inline: true },
            { name: 'Port', value: `\`${data.port}\``, inline: true },
            { name: 'Hostname', value: data.hostname || 'Unknown', inline: false },
            { name: 'Players Online', value: `\`${data.players?.online || 0}\` / **${data.players?.max || 0}**`, inline: false },
            { name: 'Version', value: `**${data.version || 'Unknown'}**`, inline: false },
            { name: 'MOTD', value: `\`\`\`ansi\n\x1b[36m${(data.motd?.clean[0] || '').trim()}\n${(data.motd?.clean[1] || '').trim()}\x1b[0m\`\`\`` }
          );
        }

        // ارسال یا ویرایش پیام
        const sendOrEdit = async (embed) => {
          if (messageId) {
            const msg = await channel.messages.fetch(messageId).catch(() => null);
            if (msg) return await msg.edit({ embeds: [embed] });
          }
          const newMsg = await channel.send({ embeds: [embed] });
          server.messageId = newMsg.id;
          await server.save();
          return newMsg;
        };

        await sendOrEdit(embed);

      } catch (error) {
        console.error(`Error fetching ${serverName} (${serverIp}):`, error.message);

        const errorEmbed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('Error')
          .setDescription(`Failed to fetch status for \`${serverIp}\`.`)
          .setTimestamp();

        const sendOrEdit = async (embed) => {
          if (messageId) {
            const msg = await channel.messages.fetch(messageId).catch(() => null);
            if (msg) return await msg.edit({ embeds: [embed] });
          }
          const newMsg = await channel.send({ embeds: [embed] });
          server.messageId = newMsg.id;
          await server.save();
          return newMsg;
        };

        await sendOrEdit(errorEmbed);
      }
    }
  };

  // شروع interval + اجرای فوری
  console.log('Starting Server Status Updater...');
  setInterval(() => {
    updateServerStatus().catch(err => console.error('Updater interval error:', err));
  }, 30000);

  // اجرای فوری بعد از آماده شدن دیتابیس
  if (mongoose.connection.readyState === 1) {
    await updateServerStatus();
  } else {
    mongoose.connection.once('connected', async () => {
      console.log('DB connected → Running initial server status update');
      await updateServerStatus();
    });
  }
};
