import { User } from './backend/models/User.js';
import { Profile } from './backend/models/Profile.js';
import { connectDB, sequelize } from './backend/config/database.js';

async function check() {
    await connectDB();
    const users = await User.findAll({ include: [{ model: Profile, as: 'profile' }] });
    console.log('--- User Profiles Check ---');
    users.forEach(u => {
        console.log(`User: ${u.email} (ID: ${u.id})`);
        console.log(`Profile: ${u.profile ? 'Exists' : 'MISSING'}`);
        if (u.profile) {
            console.log(`  Diet: ${u.profile.diet}`);
            console.log(`  Intolerances: ${JSON.stringify(u.profile.intolerances)}`);
            console.log(`  Allergies: ${JSON.stringify(u.profile.allergies)}`);
        }
        console.log('---');
    });
    await sequelize.close();
}

check();
