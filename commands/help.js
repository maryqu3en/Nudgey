const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Shows all available commands'),
    async execute(interaction) {
        const helpMessage = `
        **Nudgey Bot Help**

        **/tasks**
        Displays tasks based on optional filters.
        
        **Arguments:**
        - **date** (optional): Filter tasks by deadline range.
            - \`next-week\`: Tasks due in the next week.
            - \`next-month\`: Tasks due in the next month.
            - \`overdue\`: Tasks that are overdue.
        
        - **member** (optional): Filter tasks assigned to a specific member.
        
        - **sort** (optional): Sort tasks by deadline.
            - \`asc\`: Sort in ascending order (earliest deadlines first).
            - \`desc\`: Sort in descending order (latest deadlines first).
        

        **Example Commands:**
        - \`/tasks\`: Displays all tasks.
        - \`/tasks date: next-week\`: Displays tasks due next week.
        - \`/tasks date: overdue member: @user\`: Displays overdue tasks assigned to @user.
        - \`/tasks sort: desc\`: Displays tasks sorted by latest deadline (descending).

        `;

        await interaction.reply(helpMessage);
    },
};