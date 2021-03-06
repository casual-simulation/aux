import { prompt } from 'inquirer';
import { migrateMenu } from './migrate';
import { debugMenu } from './debug';

main()
    .then(() => {
        process.exit(0);
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });

async function main() {
    await mainMenu();
}

async function mainMenu() {
    const answer = await prompt({
        type: 'list',
        name: 'action',
        message: 'What do you want to do?',
        choices: ['Migrate', 'Debug'],
    });

    if (answer.action === 'Migrate') {
        await migrateMenu();
    } else if (answer.action === 'Debug') {
        await debugMenu();
    } else {
        console.log('Invalid Choice');
    }
}
