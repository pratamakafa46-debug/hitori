import fs from 'fs/promises'; // Use promises API for async
import { fileURLToPath } from 'url';
import path from 'path';
import { prefix } from '../../../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fileName = path.basename(__filename).split('.')[0];

export const setup = {
    permission: 0,
    group_required: false,
};

export const helping = {
    text: "Melakukan hunting melawan monster",
    use: `${prefix[0]}${fileName} 1-10`
};

const usersInBattle = [];

export async function run(ctx, obj) {
    const userId = obj.sender.id;
    const roomId = obj.room.id;
    const quoted = { quoted: obj.message.rawkey };

    if (usersInBattle.includes(userId)) {
        return ctx.sendMessage(roomId, { text: 'Kamu sedang dalam pertempuran. Tunggu sampai pertempuran selesai sebelum melakukan hunt lagi.' }, quoted);
    }

    usersInBattle.push(userId);
    const huntBattleIndex = usersInBattle.indexOf(userId);

    try {
        const m = obj.message.text.toLowerCase();
        const splitMessage = m.split(' ');

        if (!splitMessage[1]) {
            return await ctx.sendMessage(roomId, { text: 'Silakan pilih lantai 1-10' }, quoted);
        }

        // Read data files asynchronously
        const [equipmentRaw, userRaw, loginRaw, enemyRaw] = await Promise.all([
            fs.readFile('database/equipmentRpg.json', 'utf8'),
            fs.readFile('database/userRpg.json', 'utf8'),
            fs.readFile('database/login.json', 'utf8'),
            fs.readFile('database/huntRpg.json', 'utf8'),
        ]);

        const equipmentData = JSON.parse(equipmentRaw);
        const userData = JSON.parse(userRaw);
        const loginData = JSON.parse(loginRaw);
        const enemyData = JSON.parse(enemyRaw);

        if (!loginData.includes(userId)) {
            return await ctx.sendMessage(roomId, { text: 'Kamu belum login' }, quoted);
        }

        const user = userData.find(u => u.id === userId);
        if (!user) {
            return await ctx.sendMessage(roomId, { text: 'Belum terdaftar di fitur RPG silakan ketik #rpg untuk mengaktifkan fitur RPG' }, quoted);
        }

        if (user.hp <= 0) {
            return await ctx.sendMessage(roomId, { text: 'HP kamu tidak cukup untuk melakukan hunt' }, quoted);
        }

        const playerEquipment = equipmentData.find(p => p.id === userId);
        let userHp = user.hp;
        let userDamage = user.damage || 0;

        if (playerEquipment && playerEquipment.equipment) {
            for (const item of playerEquipment.equipment) {
                if (item.use === true) {
                    userDamage += item.power || 0;
                    // You can add item.hp to userHp if needed
                }
            }
        }

        let playerStats = {
            hp: userHp,
            attack: userDamage,
        };

        const floor = parseInt(splitMessage[1]);
        if (isNaN(floor) || floor < 1 || floor > 10) {
            return await ctx.sendMessage(roomId, { text: 'Lantai harus antara 1 sampai 10' }, quoted);
        }

        const enemy = enemyData.find(e => e.floor === floor);
        if (!enemy) {
            return await ctx.sendMessage(roomId, { text: 'Lantai tidak ditemukan' }, quoted);
        }

        let monsterStats = {
            hp: enemy.hp,
            attack: enemy.damage,
        };

        // Helper function to save user data
        async function saveUser Data() {
            const updatedUser Data = userData.map(u => (u.id === userId ? user : u));
            await fs.writeFile('database/userRpg.json', JSON.stringify(updatedUser Data, null, 4), 'utf8');
        }

        // Check winner
        function checkWinner(playerHP, monsterHP) {
            if (monsterHP <= 0) return "Pemain menang!";
            if (playerHP <= 0) return "Monster menang!";
            return null;
        }

        // Player attacks monster
        function playerAttackMonster() {
            monsterStats.hp -= playerStats.attack;
            if (monsterStats.hp < 0) monsterStats.hp = 0;
            return `Pemain menyerang monster! HP monster sekarang: ${monsterStats.hp}`;
        }

        // Monster attacks player
        async function monsterAttackPlayer() {
            playerStats.hp -= monsterStats.attack;
            if (playerStats.hp < 0) playerStats.hp = 0;

            user.hp -= monsterStats.attack;
            if (user.hp < 0) user.hp = 0;

            await saveUser Data();

            return `Monster menyerang pemain! HP pemain sekarang: ${playerStats.hp}`;
        }

        let mess;
        const battleResults = [];
        const battleMessage = { text: '' };

        // Initial battle info message
        const dataHunt = `╓─── Hunt lantai ${floor}\n`
            + `║ \n`
            + `║ Monster : ${enemy.enemy}\n`
            + `║ Lokasi : ${enemy.location}\n`
            + `║ HP : ${enemy.hp}\n`
            + `║ Defense : ${enemy.defense}\n`
            + `║ Damage : ${enemy.damage}\n`
            + `║ \n`
            + `╙────────────`;

        battleMessage.text = dataHunt;
        mess = await ctx.sendMessage(roomId, battleMessage, quoted);

        while (playerStats.hp > 0 && monsterStats.hp > 0) {
            // Player attacks
            const playerAttackResult = playerAttackMonster();
            battleResults.push(playerAttackResult);

            // Update battle message
            let teksResult = battleMessage.text + '\n\n' + battleResults.join('\n\n');
            await ctx.relayMessage(roomId, {
                protocolMessage: {
                    key: mess.key,
                    type: 14,
                    editedMessage: { conversation: teksResult }
                }
            }, {});

            // Check winner after player attack
            let winner = checkWinner(playerStats.hp, monsterStats.hp);
            if (winner) {
                await handleWinner(winner);
                break;
            }

            // Wait 2 seconds before monster attacks
            await new Promise(r => setTimeout(r, 2000));

            // Monster attacks
            const monsterAttackResult = await monsterAttackPlayer();
            battleResults.push(monsterAttackResult);

            // Update battle message
            teksResult = battleMessage.text + '\n\n' + battleResults.join('\n\n');
            await ctx.relayMessage(roomId, {
                protocolMessage: {
                    key: mess.key,
                    type: 14,
                    editedMessage: { conversation: teksResult }
                }
            }, {});

            // Check winner after monster attack
            winner = checkWinner(playerStats.hp, monsterStats.hp);
            if (winner) {
                await handleWinner(winner);
                break;
            }

            // Wait 2 seconds before next round
            await new Promise(r => setTimeout(r, 2000));
        }

        async function handleWinner(winner) {
            if (winner === "Pemain menang!") {
                // Calculate rewards
                const ironReward = Math.floor(Math.random() * (enemy.max_iron - enemy.min_iron + 1)) + enemy.min_iron;
                const platinumReward = Math.floor(Math.random() * (enemy.max_platinum - enemy.min_platinum + 1)) + enemy.min_platinum;
                const mythrilReward = Math.floor(Math.random() * (enemy.max_mythril - enemy.min_mythril + 1)) + enemy.min_mythril;
                const goldReward = Math.floor(Math.random() * (enemy.max_gold - enemy.min_gold + 1)) + enemy.min_gold;
                const expReward = Math.floor(Math.random() * (enemy.exp_max - enemy.exp_min + 1)) + enemy.exp_min;

                // Update user materials and exp
                user.iron += ironReward;
                user.platinum += platinumReward;
                user.mythril += mythrilReward;
                user.gold += goldReward;
                user.xp_level += expReward;

                const winnerMessage = `${winner}\n\nSisa HP: ${user.hp}/${user.max_hp}\n\nRewards:\nGold: ${goldReward}\nIron: ${ironReward}\nPlatinum: ${platinumReward}\nMythril: ${mythrilReward}\nEXP Gained: ${expReward}`;

                await ctx.sendMessage(roomId, { text: winnerMessage }, quoted);
                await saveUser Data();

            } else if (winner === "Monster menang!") {
                const loserMessage = `${winner}\n\nSisa HP: ${user.hp}/${user.max_hp}`;
                await ctx.sendMessage(roomId, { text: loserMessage }, quoted);
            }
        }

    } catch (error) {
        console.error('Error in hunt run:', error);
        await ctx.sendMessage(obj.room.id, { text: 'Terjadi kesalahan saat melakukan hunt.' }, { quoted: obj.message.rawkey });
    } finally {
        // Remove user from battle list on all exit paths
        if (huntBattleIndex !== -1) {
            usersInBattle.splice(huntBattleIndex, 1);
        }
    }
                                   }
  
