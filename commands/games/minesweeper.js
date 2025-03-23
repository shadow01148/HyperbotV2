const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("minesweeper")
    .setDescription("Start a game of Minesweeper!")
    .addIntegerOption(option =>
      option.setName("size")
        .setDescription("Grid size (Default: 5)")
        .setMinValue(3)
        .setMaxValue(10)
    )
    .addIntegerOption(option =>
      option.setName("mines")
        .setDescription("Number of mines (Default: 5)")
        .setMinValue(1)
    ),
  
  async execute(interaction) {
    const size = interaction.options.getInteger("size") || 5;
    const mineCount = interaction.options.getInteger("mines") || 5;

    if (mineCount >= size * size) {
      return interaction.reply({ content: "Too many mines!", flags: MessageFlags.Ephemeral });
    }

    const board = generateBoard(size, mineCount);
    const revealed = Array.from({ length: size }, () => Array(size).fill(false));

    await interaction.reply({ content: "Minesweeper started!", components: renderBoard(board, revealed, size) });

    const collector = interaction.channel.createMessageComponentCollector({ time: 300000 });

    collector.on("collect", async (button) => {
      const [x, y] = button.customId.split("_").slice(1).map(Number);
      
      if (board[x][y] === "💥") {
        await button.update({ content: "💥 Boom! You hit a mine!", components: renderBoard(board, revealed, size, true) });
        collector.stop();
      } else {
        reveal(board, revealed, x, y, size);
        await button.update({ components: renderBoard(board, revealed, size) });
      }
    });
  },
};

function generateBoard(size, mineCount) {
  let board = Array.from({ length: size }, () => Array(size).fill(0));

  let mines = [];
  while (mines.length < mineCount) {
    let x = Math.floor(Math.random() * size);
    let y = Math.floor(Math.random() * size);
    if (!mines.some(([mx, my]) => mx === x && my === y)) {
      mines.push([x, y]);
      board[x][y] = "💥";
    }
  }

  for (let [mx, my] of mines) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        let nx = mx + dx, ny = my + dy;
        if (nx >= 0 && ny >= 0 && nx < size && ny < size && board[nx][ny] !== "💥") {
          board[nx][ny]++;
        }
      }
    }
  }

  return board;
}

function renderBoard(board, revealed, size, gameOver = false) {
  let rows = [];
  for (let x = 0; x < size; x++) {
    let row = new ActionRowBuilder();
    for (let y = 0; y < size; y++) {
      let label = revealed[x][y] ? board[x][y].toString() : "⬜";
      if (gameOver && board[x][y] === "💥") label = "💥";

      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`tile_${x}_${y}`)
          .setLabel(label)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(revealed[x][y] || gameOver)
      );
    }
    rows.push(row);
  }
  return rows;
}

function reveal(board, revealed, x, y, size) {
  if (x < 0 || y < 0 || x >= size || y >= size || revealed[x][y]) return;
  revealed[x][y] = true;
  if (board[x][y] === 0) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        reveal(board, revealed, x + dx, y + dy, size);
      }
    }
  }
}
