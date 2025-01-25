const { SlashCommandBuilder } = require('@discordjs/builders');
const { Client } = require('@notionhq/client');
const notion = new Client({ auth: process.env.NOTION_TOKEN });

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tasks')
        .setDescription('Shows tasks with optional filters for date, assigned member, sorting, and status.')
        .addStringOption(option =>
            option.setName('date')
                .setDescription('Filter tasks by date range (next-week, next-month, overdue)')
                .setRequired(false)
                .addChoices(
                    { name: 'Next Week', value: 'next-week' },
                    { name: 'Next Month', value: 'next-month' },
                    { name: 'Overdue', value: 'overdue' },
                ))
        .addUserOption(option =>
            option.setName('member')
                .setDescription('Filter tasks assigned to a specific member')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('sort')
                .setDescription('Sort tasks by deadline (ascending or descending)')
                .setRequired(false)
                .addChoices(
                    { name: 'Ascending', value: 'asc' },
                    { name: 'Descending', value: 'desc' },
                ))
        .addStringOption(option =>
            option.setName('status')
                .setDescription('Filter tasks by status (incomplete or complete)')
                .setRequired(false)
                .addChoices(
                    { name: 'Incomplete', value: 'incomplete' },
                    { name: 'Complete', value: 'complete' },
                )),

    async execute(interaction) {
        await interaction.deferReply();

        const dateFilter = interaction.options.getString('date');
        const member = interaction.options.getUser('member');
        const sortOrder = interaction.options.getString('sort') || 'asc';
        const statusFilter = interaction.options.getString('status') || 'incomplete';

        const today = new Date();
        let dateFilterConditions = {};

        if (dateFilter === 'next-week') {
            const nextWeek = new Date(today);
            nextWeek.setDate(today.getDate() + 7);
            dateFilterConditions = {
                property: 'Deadline',
                date: {
                    after: today.toISOString(),
                    before: nextWeek.toISOString(),
                },
            };
        } else if (dateFilter === 'next-month') {
            const nextMonth = new Date(today);
            nextMonth.setMonth(today.getMonth() + 1);
            dateFilterConditions = {
                property: 'Deadline',
                date: {
                    after: today.toISOString(),
                    before: nextMonth.toISOString(),
                },
            };
        } else if (dateFilter === 'overdue') {
            dateFilterConditions = {
                property: 'Deadline',
                date: {
                    before: today.toISOString(),
                },
            };
        }

        let statusFilterConditions = {};
        if (statusFilter === 'incomplete') {
            statusFilterConditions = {
                property: 'Status',
                checkbox: {
                    equals: false,
                },
            };
        } else if (statusFilter === 'complete') {
            statusFilterConditions = {
                property: 'Status',
                checkbox: {
                    equals: true,
                },
            };
        }

        const filter = {
            and: [
                dateFilterConditions,
                statusFilterConditions,
                member ? { property: 'Assigned To', people: { contains: member.id } } : {}
            ].filter(condition => Object.keys(condition).length > 0)
        };

        const response = await notion.databases.query({
            database_id: process.env.NOTION_TASKS_DB_ID,
            filter: filter,
            sorts: [
                {
                    property: 'Deadline',
                    direction: sortOrder === 'asc' ? 'ascending' : 'descending',
                },
            ],
        });

        const formattedTasks = await Promise.all(response.results.map(async (task) => {
            const name = task.properties.Name.title[0].text.content;
            const deadline = task.properties.Deadline.date.start;
            const assignedMembers = await Promise.all(task.properties['Assigned To'].relation.map(async (relation) => {
                const relatedPage = await notion.pages.retrieve({ page_id: relation.id });
                const discordIdProperty = relatedPage.properties['Discord ID'];
                const discordId = discordIdProperty && discordIdProperty.rich_text
                    ? discordIdProperty.rich_text[0].text.content
                    : null; // Ensure the Discord ID exists
                return discordId ? `<@${discordId}>` : 'Unknown Member';
            }));
            return `**${name}** - Deadline: ${deadline} - Assigned to: ${assignedMembers.join(', ')}`;
        }));

        const resultMessage = formattedTasks.join('\n');

        if (resultMessage) {
            await interaction.editReply(resultMessage);
        } else {
            await interaction.editReply('No tasks found with the specified filters.');
        }
    },
};