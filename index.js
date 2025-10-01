const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
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
const MASTER_ROLE_ID = process.env.MASTER_ROLE_ID; // Cargo de Mestre da Comunidade

// 🚫 IDs de cargos que NÃO devem ganhar XP nem aparecer no ranking
const EXCLUDED_ROLES = [
  "1419858565388308582",
  "1422363833330171957",
  "1422940293967380503",
  "1419835737666355375",
  "1409578158398767214",
  "1411472970429239376",
  "1409586436201513107",
  "1409586091874320470",
  "1412452682194616393"
];

// Sistema de XP
let xpData = {};
const XP_FILE = "./xp.json";

// Carrega XP já existente, se houver
if (fs.existsSync(XP_FILE)) {
  try {
    const data = fs.readFileSync(XP_FILE, "utf8");
    xpData = data ? JSON.parse(data) : {};
  } catch (err) {
    console.error("Erro ao carregar xp.json:", err);
    xpData = {};
  }
} else {
  xpData = {};
}

// Função para calcular XP necessário por nível (progressiva)
function getRequiredXP(level) {
  return Math.floor(50 * Math.pow(level, 2));
}

// Evento: quando o bot fica online
client.once("ready", () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
});

// Evento: mensagens recebidas
client.on("messageCreate", async (message) => {
  if (message.author.bot) return; // ignora outros bots
  const userId = message.author.id;

  // 🔒 Verifica se o usuário tem algum cargo bloqueado
  const member = await message.guild.members.fetch(userId).catch(() => null);
  if (member && member.roles.cache.some(role => EXCLUDED_ROLES.includes(role.id))) {
    return; // não ganha XP nem entra no ranking
  }

  // --- SISTEMA DE RANKING (COMANDO !rank) ---
  if (message.content.toLowerCase() === "!rank") {
    const ranking = Object.entries(xpData)
      .sort((a, b) => b[1].xp - a[1].xp);

    if (ranking.length === 0) {
      return message.channel.send("📊 Ninguém tem XP ainda!");
    }

    let descricao = "";
    let posicao = 1;

    for (let i = 0; i < ranking.length; i++) {
      const [id, dados] = ranking[i];
      const user = await client.users.fetch(id).catch(() => null);
      if (!user) continue;

      const membro = await message.guild.members.fetch(id).catch(() => null);
      if (!membro) continue;

      if (membro.roles.cache.some(role => EXCLUDED_ROLES.includes(role.id))) continue;

      descricao += `**${posicao}. ${user.username}** — 🏅 Nível ${dados.level} • ${dados.xp} XP\n`;
      posicao++;
      if (posicao > 5) break;
    }

    if (!descricao) {
      return message.channel.send("📊 Ninguém qualificado para o ranking ainda!");
    }

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle("🏆 Ranking dos mais ativos 🏆")
      .setDescription(descricao)
      .setFooter({ text: "Continue participando para se tornar um MESTRE DA COMUNIDADE!" })
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
    return;
  }

  // --- COMANDO !meuxp ---
  if (message.content.toLowerCase() === "!meuxp") {
    if (!xpData[userId]) xpData[userId] = { xp: 0, level: 1 };

    const dados = xpData[userId];
    const requiredXP = getRequiredXP(dados.level);

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle(`📊 Progresso de ${message.author.username}`)
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: "🏅 Nível atual", value: `${dados.level}`, inline: true },
        { name: "⚡ XP atual", value: `${dados.xp}/${requiredXP}`, inline: true }
      )
      .setFooter({ text: "Continue participando para se tornar um MESTRE DA COMUNIDADE!" })
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
    return;
  }

  // --- SISTEMA DE XP ---
  if (!xpData[userId]) xpData[userId] = { xp: 0, level: 1 };

  const xpGanho = Math.floor(Math.random() * 6) + 3;
  xpData[userId].xp += xpGanho;

  const requiredXP = getRequiredXP(xpData[userId].level);
  if (xpData[userId].xp >= requiredXP) {
    xpData[userId].level++;
    xpData[userId].xp = 0;

    message.channel.send(
      `🎉 Parabéns ${message.author}, você subiu para o nível ${xpData[userId].level}!`
    );

    // Dar cargo Mestre da Comunidade no nível 10
    if (xpData[userId].level === 10) {
      try {
        await member.roles.add(MASTER_ROLE_ID);

        const embed = new EmbedBuilder()
          .setColor(0xf1c40f) // dourado
          .setTitle("👑 Novo Mestre da Comunidade! 👑")
          .setDescription(`Parabéns ${message.author}, você alcançou o **Nível 10** e agora é um **MESTRE DA COMUNIDADE**! 🎉`)
          .addFields(
            { name: "✨ Benefícios", value: "• Cargo exclusivo\n• Acesso a eventos especiais\n• Sorteios e recompensas" }
          )
          .setFooter({ text: "Obrigado por manter nossa comunidade viva e engajada!" })
          .setTimestamp();

        message.channel.send({ embeds: [embed] });
      } catch (err) {
        console.error("Erro ao dar cargo Mestre:", err);
      }
    }
  }

  fs.writeFileSync(XP_FILE, JSON.stringify(xpData, null, 2));

  // --- SISTEMA DE CARGO POR MENÇÃO ---
  if (message.channel.id === CHANNEL_ID && message.mentions.users.size > 0) {
    message.mentions.users.forEach(async (user) => {
      try {
        const membro = await message.guild.members.fetch(user.id);
        await membro.roles.add(ROLE_ID);
        console.log(`🎯 Cargo por menção adicionado para ${membro.user.tag}`);
      } catch (err) {
        console.error("Erro ao adicionar cargo por menção:", err);
      }
    });
  }
});

// --- Servidor web "fake" para o Render --- //
const express = require("express");
const app = express();

app.get("/", (req, res) => res.send("🤖 CaimanBot está rodando!"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Servidor web ativo na porta ${PORT}`);
});

// Login do bot
client.login(process.env.TOKEN);
