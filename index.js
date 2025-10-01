const { Client, GatewayIntentBits } = require("discord.js");
require("dotenv").config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// IDs (copie do Discord com "Modo Desenvolvedor" ativado)
const CHANNEL_ID = process.env.CHANNEL_ID; // canal em que a regra funciona
const ROLE_ID = process.env.ROLE_ID;       // cargo que será atribuído

client.on("ready", () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return; // ignora bots
  if (message.channel.id !== CHANNEL_ID) return; // só reage no canal certo

  if (message.mentions.users.size > 0) {
    message.mentions.users.forEach(async (user) => {
      try {
        const member = await message.guild.members.fetch(user.id);
        await member.roles.add(ROLE_ID);
        console.log(`🎉 Cargo adicionado para ${member.user.tag}`);
      } catch (err) {
        console.error("❌ Erro ao adicionar cargo:", err);
      }
    });
  }
});

client.login(process.env.TOKEN);
