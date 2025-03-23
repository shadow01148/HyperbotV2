const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tictactoe")
    .setDescription("Start a game of Tic-Tac-Toe!")
    .addUserOption(option =>
      option.setName("opponent")
        .setDescription("Choose your opponent")
        .setRequired(true)
    ),
  
  async execute(interaction) {
    const playerX = interaction.user;
    const playerO = interaction.options.getUser("opponent");

    if (playerO.bot) return interaction.reply({ content: "You can't play against a bot!", flags: MessageFlags.Ephemeral });
    if (playerO.id === playerX.id) return interaction.reply({ content: "You can't play against yourself!", flags: MessageFlags.Ephemeral });

    let board = Array(3).fill().map(() => Array(3).fill(null));
    let currentPlayer = playerX;
    let symbol = { [playerX.id]: "❌", [playerO.id]: "⭕" };

    await interaction.reply({ content: `Tic-Tac-Toe: **${playerX.username} (❌)** vs **${playerO.username} (⭕)**`, components: renderBoard(board) });

    const collector = interaction.channel.createMessageComponentCollector({ time: 300000 });

    collector.on("collect", async (button) => {
      if (button.user.id !== currentPlayer.id) {
        return button.reply({ content: "It's not your turn!", flags: MessageFlags.Ephemeral });
      }

      let [x, y] = button.customId.split("_").slice(1).map(Number);
      if (board[x][y] !== null) {
        return button.reply({ content: "That spot is already taken!", flags: MessageFlags.Ephemeral });
      }

      board[x][y] = symbol[currentPlayer.id];
      if (checkWin(board, symbol[currentPlayer.id])) {
        collector.stop();
        return button.update({ content: `🎉 **${currentPlayer.username} wins!**`, components: renderBoard(board, true) });
      }

      if (board.flat().every(cell => cell !== null)) {
        collector.stop();
        return button.update({ content: "😐 It's a draw!", components: renderBoard(board, true) });
      }

      currentPlayer = currentPlayer.id === playerX.id ? playerO : playerX;
      await button.update({ content: `Tic-Tac-Toe: **${playerX.username} (❌)** vs **${playerO.username} (⭕)**\n${currentPlayer.username}'s turn (${symbol[currentPlayer.id]})**`, components: renderBoard(board) });
    });
  },
};

function renderBoard(board, gameOver = false) {
  return board.map((row, x) => {
    let actionRow = new ActionRowBuilder();
    row.forEach((cell, y) => {
      actionRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`tile_${x}_${y}`)
          .setLabel(cell || "⬜")
          .setStyle(cell ? ButtonStyle.Secondary : ButtonStyle.Primary)
          .setDisabled(gameOver || cell !== null)
      );
    });
    return actionRow;
  });
}

function checkWin(board, playerSymbol) {
  return (
    board.some(row => row.every(cell => cell === playerSymbol)) ||
    board[0].some((_, col) => board.every(row => row[col] === playerSymbol)) ||
    board.every((row, idx) => row[idx] === playerSymbol) ||
    board.every((row, idx) => row[2 - idx] === playerSymbol)
  );
}
