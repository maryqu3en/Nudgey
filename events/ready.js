const { Events } = require('discord.js');
const { Client: NotionClient } = require('@notionhq/client');
const schedule = require('node-schedule');

const notion = new NotionClient({ auth: process.env.NOTION_TOKEN });

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);
        client.user.setActivity('/help', { type: 'LISTENING' });

        // schedule.scheduleJob('0 9 * * *', () => {
        //     checkTasksAndSendReminders(client);
        // });

        // schedule.scheduleJob('0 24 * * *', () => {
        //     checkTasksAndSendReminders(client);
        // });
    },
};

async function checkTasksAndSendReminders(client) {
    try {
        const today = new Date();
        const response = await notion.databases.query({
            database_id: process.env.NOTION_TASKS_DB_ID,
            filter: {
                property: 'Deadline',
                date: {
                    after: today.toISOString(),
                },
            },
        });

        const tasksDueSoon = response.results.filter(task => {
            const deadline = new Date(task.properties.Deadline.date.start);
            return deadline - today <= 24 * 60 * 60 * 1000; // task due within 1 day
        });

        if (tasksDueSoon.length > 0) {
            tasksDueSoon.forEach(async (task) => {
                const name = task.properties.Name.title[0].text.content;
                const deadline = task.properties.Deadline.date.start;
                const assignedMembers = await Promise.all(task.properties['Assigned To'].relation.map(async (relation) => {
                    const relatedPage = await notion.pages.retrieve({ page_id: relation.id });
                    const discordIdProperty = relatedPage.properties['Discord ID'];
                    const discordId = discordIdProperty && discordIdProperty.rich_text
                        ? discordIdProperty.rich_text[0].text.content
                        : null;
                    return discordId ? `<@${discordId}>` : null;
                }));

                const taskMessage = `Reminder: **${name}** is due soon (Deadline: ${deadline}) - Assigned to: ${assignedMembers.join(', ')}`;
                const channel = client.channels.cache.get('1175032565887946773');
                if (channel) {
                    await channel.send(taskMessage);
                }
            });
        }
    } catch (error) {
        console.error('Error while checking tasks:', error);
    }
}
