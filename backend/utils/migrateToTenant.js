import { sequelize } from '../config/database.js';
import { User } from '../models/User.js';
import { Organization } from '../models/Organization.js';
import { UserOrganization } from '../models/UserOrganization.js';
import { ActivityLogger } from '../services/ActivityLogger.js';

async function migrate() {
    console.log('🚀 Starting Multi-Tenant Data Migration...');
    
    try {
        // 1. Ensure we have a default organization
        let defaultOrg = await Organization.findOne({ where: { slug: 'default-org' } });
        
        if (!defaultOrg) {
            console.log('Creating default organization...');
            defaultOrg = await Organization.create({
                name: 'Default Organization',
                slug: 'default-org',
                is_active: true,
                settings: { legacy: true }
            });
            console.log(`Created organization: ${defaultOrg.name} (${defaultOrg.id})`);
        } else {
            console.log(`Using existing organization: ${defaultOrg.name} (${defaultOrg.id})`);
        }

        const orgId = defaultOrg.id;

        // 2. Migrate Users
        console.log('Migrating orphan users...');
        const [updatedUsers] = await sequelize.query(
            `UPDATE users SET organization_id = :orgId WHERE organization_id IS NULL;`,
            { replacements: { orgId } }
        );
        console.log(`Updated users directly: ${updatedUsers.rowCount || 'Check logs'}`);

        // 3. Sync UserOrganization join table
        console.log('Syncing user_organizations join table...');
        const users = await User.findAll({ where: { organization_id: orgId } });
        let linksCreated = 0;
        for (const user of users) {
            const [link, created] = await UserOrganization.findOrCreate({
                where: { user_id: user.id, organization_id: orgId },
                defaults: { role: user.role || 'user' }
            });
            if (created) linksCreated++;
        }
        console.log(`Created ${linksCreated} new associations in user_organizations.`);

        // 4. Migrate Recipes
        console.log('Migrating orphan recipes...');
        const [updatedRecipes] = await sequelize.query(
            `UPDATE recipes SET organization_id = :orgId WHERE organization_id IS NULL;`,
            { replacements: { orgId } }
        );
        console.log(`Updated recipes: ${updatedRecipes.rowCount || 'Check logs'}`);

        // 5. Migrate Logs and Favorites
        const otherTables = ['activity_logs', 'search_logs', 'favorite_recipes'];
        for (const table of otherTables) {
            console.log(`Migrating orphan records in ${table}...`);
            const [result] = await sequelize.query(
                `UPDATE ${table} SET organization_id = :orgId WHERE organization_id IS NULL;`,
                { replacements: { orgId } }
            );
            console.log(`Updated ${table}: ${result.rowCount || 'Check logs'}`);
        }

        console.log('✅ Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        ActivityLogger.error('Multi-tenant migration script failed', error);
    } finally {
        await sequelize.close();
    }
}

migrate();
