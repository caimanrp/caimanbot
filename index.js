const { Client, GatewayIntentBits } = require("discord.js");
const fs = require("fs");
require("dotenv").config();

// Cria o cliente do bot
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// IDs vindos do .env ou do Render
const CHANNEL_ID = process.env.CHANNEL_ID; // Canal que dá cargo por menção
const ROLE_ID = process.env.ROLE_ID;       // Cargo para quem for mencionado
const XP_ROLE_ID = process.env.XP_ROLE_ID; // Cargo especial por nível

// Sistema de XP
let xpData = {};
const XP_FILE = "./xp.json";

// Carrega XP já existente, se houver
if (fs.existsSync(XP_FILE)) {
  xpData = JSON.parse(fs.readFileSync(XP_FILE));
}

// Função para calcular XP necessário por nível
function getRequiredXP(level) {
  return 100 * level; // Exemplo: 100 XP lvl 2, 200 lvl 3...
}

// Evento: quando o bot fica online
client.once("ready", () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
});

// Evento: mensagens recebidas
client.on("messageCreate", async (message) => {
  if (message.author.bot) return; // ignora outros bots
  const userId = message.author.id;

// --- SISTEMA DE RANKING (COMANDO !rank) ---
if (message.content.toLowerCase() === "!rank") {
    console.log("📊 Comando !rank detectado");
  // Ordena os usuários por XP
    const ranking = Object.entries(xpData)
    .sort((a, b) => b[1].xp - a[1].xp) // do maior para o menor
    .slice(0, 5); // mostra só o top 5

  if (ranking.length === 0) {
    return message.channel.send("📊 Ninguém tem XP ainda!");
  }

  let descricao = "";
  for (let i = 0; i < ranking.length; i++) {
    const [id, dados] = ranking[i];
    const user = await client.users.fetch(id);
    descricao += `**${i + 1}. ${user.username}** — 🏅 Nível ${dados.level} • ${dados.xp} XP\n`;
  }

  // Cria o embed
  const { EmbedBuilder } = require("discord.js");
  const embed = new EmbedBuilder()
    .setColor(0x3498db) // azul bonito
    .setTitle("🏆 Ranking dos mais ativos 🏆")
    .setDescription(descricao)
    .setFooter({ text: "Continue participando para subir no ranking!" })
    .setTimestamp();

  return message.channel.send({ embeds: [embed] });
}

  // --- SISTEMA DE XP ---
  if (!xpData[userId]) {
    xpData[userId] = { xp: 0, level: 1 };
  }

  // Ganha XP aleatório entre 5 e 15
  const xpGanho = Math.floor(Math.random() * 11) + 5;
  xpData[userId].xp += xpGanho;

  // Checa se subiu de nível
  const requiredXP = getRequiredXP(xpData[userId].level);
  if (xpData[userId].xp >= requiredXP) {
    xpData[userId].level++;
    xpData[userId].xp = 0;

    message.channel.send(
      `🎉 Parabéns ${message.author}, você subiu para o nível ${xpData[userId].level}!`
    );

    // Dar cargo especial quando atingir nível 5
    if (xpData[userId].level === 5) {
      try {
        const member = await message.guild.members.fetch(userId);
        await member.roles.add(XP_ROLE_ID);
        message.channel.send(`✅ ${message.author} recebeu o cargo especial por chegar ao nível 5!`);
      } catch (err) {
        console.error("Erro ao dar cargo de XP:", err);
      }
    }
  }

  // Salva progresso no arquivo
  fs.writeFileSync(XP_FILE, JSON.stringify(xpData, null, 2));

  // --- SISTEMA DE CARGO POR MENÇÃO ---
  if (message.channel.id === CHANNEL_ID && message.mentions.users.size > 0) {
    message.mentions.users.forEach(async (user) => {
      try {
        const member = await message.guild.members.fetch(user.id);
        await member.roles.add(ROLE_ID);
        console.log(`🎯 Cargo por menção adicionado para ${member.user.tag}`);
      } catch (err) {
        console.error("Erro ao adicionar cargo por menção:", err);
      }
    });
  }
});

// Login do bot
client.login(process.env.TOKEN);
